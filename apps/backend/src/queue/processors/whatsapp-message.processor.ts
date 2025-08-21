import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CbbClientService } from '@visapi/backend-core-cbb';
import { WhatsAppMessageJobData } from '@visapi/shared-types';
import { SupabaseService } from '@visapi/core-supabase';
import { LogService } from '@visapi/backend-logging';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

// Hebrew translation maps
const COUNTRY_NAMES_HEBREW: Record<string, string> = {
  'india': 'הודו',
  'usa': 'ארה"ב',
  'us': 'ארה"ב',
  'united states': 'ארה"ב',
  'u.s.': 'ארה"ב',
  'uk': 'בריטניה',
  'united kingdom': 'בריטניה',
  'britain': 'בריטניה',
  'canada': 'קנדה',
  'israel': 'ישראל',
  'thailand': 'תאילנד',
  'south korea': 'דרום קוריאה',
  'korea': 'קוריאה',
  'vietnam': 'וייטנאם',
  'saudi arabia': 'ערב הסעודית',
  'saudi': 'סעודיה',
  'indonesia': 'אינדונזיה',
  'bahrain': 'בחריין',
  'new zealand': 'ניו זילנד',
  'cambodia': 'קמבודיה',
  'schengen': 'אזור שנגן',
  'schengen area': 'אזור שנגן',
  'morocco': 'מרוקו',
  'sri lanka': 'סרי לנקה',
  'togo': 'טוגו',
  'china': 'סין',
  'japan': 'יפן',
  'singapore': 'סינגפור',
  'australia': 'אוסטרליה',
  'brazil': 'ברזיל',
  'mexico': 'מקסיקו',
  'argentina': 'ארגנטינה',
  'chile': 'צ\'ילה',
  'peru': 'פרו',
  'colombia': 'קולומביה',
  'egypt': 'מצרים',
  'jordan': 'ירדן',
  'uae': 'איחוד האמירויות',
  'united arab emirates': 'איחוד האמירויות',
  'turkey': 'טורקיה',
  'greece': 'יוון',
  'cyprus': 'קפריסין',
  'russia': 'רוסיה',
  'ukraine': 'אוקראינה',
  'poland': 'פולין',
  'germany': 'גרמניה',
  'france': 'צרפת',
  'spain': 'ספרד',
  'italy': 'איטליה',
  'netherlands': 'הולנד',
  'belgium': 'בלגיה',
  'switzerland': 'שוויץ',
  'austria': 'אוסטריה',
  'portugal': 'פורטוגל',
  'sweden': 'שוודיה',
  'norway': 'נורבגיה',
  'denmark': 'דנמרק',
  'finland': 'פינלנד',
};

const VISA_TYPES_HEBREW: Record<string, string> = {
  'tourist': 'תיירות',
  'tourism': 'תיירות',
  'business': 'עסקים',
  'student': 'סטודנט',
  'evisa': 'ויזה אלקטרונית',
  'e-visa': 'ויזה אלקטרונית',
  'transit': 'מעבר',
  'medical': 'רפואית',
  'work': 'עבודה',
  'conference': 'כנס',
  'family': 'משפחה',
  'pilgrimage': 'עלייה לרגל',
  'diplomatic': 'דיפלומטית',
  'official': 'רשמית',
  'multiple': 'רב כניסות',
  'single': 'כניסה יחידה',
};

const VALIDITY_HEBREW: Record<string, string> = {
  'month': 'חודש',
  '1month': 'חודש',
  'year': 'שנה',
  '1year': 'שנה',
  '3months': '3 חודשים',
  '6months': '6 חודשים',
  '2years': 'שנתיים',
  '3years': '3 שנים',
  '5years': '5 שנים',
  '10years': '10 שנים',
  '30days': '30 יום',
  '60days': '60 יום',
  '90days': '90 יום',
  '180days': '180 יום',
  '365days': 'שנה',
};

// Order data interface matching the database structure
interface OrderData {
  order_id: string;
  client_phone: string;
  client_name: string;
  client_email: string;
  product_country: string;
  product_doc_type: string;
  product_intent?: string;
  product_entries?: string;
  product_validity?: string;
  product_days_to_use?: number;
  visa_quantity: number;
  urgency: string;
  amount: number;
  currency: string;
  entry_date: string;
  branch: string;
  whatsapp_alerts_enabled: boolean;
  whatsapp_confirmation_sent?: boolean;
  whatsapp_confirmation_sent_at?: string;
  whatsapp_message_id?: string;
  cbb_contact_id?: string;
}

@Injectable()
@Processor('whatsapp-messages')
export class WhatsAppMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppMessageProcessor.name);

  constructor(
    private readonly cbbService: CbbClientService,
    private readonly supabaseService: SupabaseService,
    private readonly logService: LogService,
    @InjectMetric('whatsapp_messages_sent')
    private readonly messagesSentCounter: Counter<string>,
    @InjectMetric('whatsapp_messages_failed')
    private readonly messagesFailedCounter: Counter<string>,
    @InjectMetric('whatsapp_message_duration')
    private readonly messageDurationHistogram: Histogram<string>,
  ) {
    super();
  }

  async process(job: Job<WhatsAppMessageJobData>): Promise<any> {
    const { orderId, contactId, messageType } = job.data;
    const startTime = Date.now();

    this.logger.log(`Processing WhatsApp ${messageType} for order: ${orderId}`);

    try {
      // Fetch order details
      const order = await this.getOrderByOrderId(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Check if already sent (idempotency)
      if (messageType === 'order_confirmation' && order.whatsapp_confirmation_sent) {
        this.logger.log(`WhatsApp confirmation already sent for order ${orderId}`);
        return {
          status: 'skipped',
          reason: 'already_sent',
          orderId,
        };
      }

      // Verify WhatsApp alerts are enabled
      if (!order.whatsapp_alerts_enabled) {
        this.logger.log(`WhatsApp alerts disabled for order ${orderId}`);
        return {
          status: 'skipped',
          reason: 'alerts_disabled',
          orderId,
        };
      }

      // Only send for IL branch orders
      if (order.branch?.toLowerCase() !== 'il') {
        this.logger.log(`Skipping WhatsApp for non-IL branch order ${orderId} (branch: ${order.branch})`);
        return {
          status: 'skipped',
          reason: 'non_il_branch',
          orderId,
        };
      }

      // Build message based on type
      let message: string;
      switch (messageType) {
        case 'order_confirmation':
          message = this.buildOrderConfirmationMessage(order);
          break;
        case 'status_update':
          message = this.buildStatusUpdateMessage(order);
          break;
        case 'document_ready':
          message = this.buildDocumentReadyMessage(order);
          break;
        default:
          throw new Error(`Unsupported message type: ${messageType}`);
      }

      // Send message via CBB API
      // CBB expects numeric contact ID, but we store it as string (phone number)
      const numericContactId = parseInt(contactId, 10);
      if (isNaN(numericContactId)) {
        throw new Error(`Invalid contact ID: ${contactId}`);
      }
      
      const result = await this.cbbService.sendTextMessage(numericContactId, message);

      // Update order with WhatsApp tracking info
      if (messageType === 'order_confirmation') {
        await this.updateOrderWhatsAppStatus(orderId, result.message_id || 'sent');
      }

      // Log success
      this.logger.log(`WhatsApp ${messageType} sent successfully for order ${orderId}`, {
        contact_id: contactId,
        message_id: result.message_id,
      });

      await this.logService.createLog({
        level: 'info',
        message: `WhatsApp ${messageType} sent successfully`,
        metadata: {
          order_id: orderId,
          contact_id: contactId,
          message_type: messageType,
          message_id: result.message_id,
          source: 'whatsapp_message',
        },
      });

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      this.messageDurationHistogram.observe({ message_type: messageType }, duration);
      this.messagesSentCounter.inc({ message_type: messageType });

      return {
        status: 'success',
        orderId,
        contactId,
        messageId: result.message_id,
        messageType,
      };
    } catch (error) {
      // Handle errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Failed to send WhatsApp ${messageType} for order ${orderId}`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      await this.logService.createLog({
        level: 'error',
        message: `Failed to send WhatsApp ${messageType}`,
        metadata: {
          order_id: orderId,
          contact_id: contactId,
          message_type: messageType,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          source: 'whatsapp_message',
        },
      });

      // Record failure metrics
      const duration = (Date.now() - startTime) / 1000;
      this.messageDurationHistogram.observe({ message_type: messageType }, duration);
      this.messagesFailedCounter.inc({ message_type: messageType });

      throw error;
    }
  }

  private buildOrderConfirmationMessage(order: OrderData): string {
    // Get Hebrew translations
    const countryHebrew = this.getCountryNameHebrew(order.product_country);
    const countryFlag = this.getCountryFlag(order.product_country);
    const visaTypeHebrew = this.getVisaTypeHebrew(order.product_doc_type, order.product_intent);
    const processingDays = this.calculateProcessingDays(order);

    // Build the message with RTL support
    const message = `שלום ${order.client_name},

הזמנתך לויזה ל${countryHebrew} התקבלה בהצלחה ${countryFlag}

להלן פרטי הזמנתך:
• *מספר הזמנה*: ${order.order_id}
• *סוג ויזה*: ${visaTypeHebrew}
• *כמות מבקשים*: ${order.visa_quantity}×
• *סכום תשלום*: ₪${order.amount}
• *צפי לקבלת אישור תוך*: ${processingDays} ימי עסקים

צוות המומחים שלנו כבר החל לטפל בבקשתך. נעדכן אותך כאן בוואטסאפ ברגע שהאישור יהיה מוכן.

בינתיים, אם יש לך שאלות או בקשות – אנחנו כאן בשבילך בכל שלב.

*תודה שבחרת בויזה.נט* 🛂`;

    return message;
  }

  private buildStatusUpdateMessage(order: OrderData): string {
    // Placeholder for status update message
    const countryHebrew = this.getCountryNameHebrew(order.product_country);
    
    return `שלום ${order.client_name},

עדכון לגבי הזמנה ${order.order_id} - ויזה ל${countryHebrew}:

הבקשה שלך בטיפול והכל מתקדם כמתוכנן ✅

נעדכן אותך ברגע שיהיו חדשות.

*צוות ויזה.נט* 🛂`;
  }

  private buildDocumentReadyMessage(order: OrderData): string {
    // Placeholder for document ready message
    const countryHebrew = this.getCountryNameHebrew(order.product_country);
    
    return `שלום ${order.client_name},

חדשות טובות! 🎉

הויזה שלך ל${countryHebrew} מוכנה!
*מספר הזמנה*: ${order.order_id}

אנחנו שולחים לך את המסמכים למייל ${order.client_email}

תודה שבחרת בויזה.נט ונסיעה טובה! ✈️`;
  }

  private getCountryNameHebrew(country: string): string {
    const normalizedCountry = country?.toLowerCase().trim();
    return COUNTRY_NAMES_HEBREW[normalizedCountry] || country;
  }

  private getCountryFlag(country: string): string {
    // Map of country names to flag emojis
    const normalizedCountry = country?.toLowerCase().trim();
    
    const countryFlags: Record<string, string> = {
      'india': '🇮🇳',
      'usa': '🇺🇸',
      'us': '🇺🇸',
      'united states': '🇺🇸',
      'u.s.': '🇺🇸',
      'uk': '🇬🇧',
      'united kingdom': '🇬🇧',
      'britain': '🇬🇧',
      'canada': '🇨🇦',
      'israel': '🇮🇱',
      'thailand': '🇹🇭',
      'south korea': '🇰🇷',
      'korea': '🇰🇷',
      'vietnam': '🇻🇳',
      'saudi arabia': '🇸🇦',
      'saudi': '🇸🇦',
      'indonesia': '🇮🇩',
      'bahrain': '🇧🇭',
      'new zealand': '🇳🇿',
      'cambodia': '🇰🇭',
      'schengen': '🇪🇺',
      'schengen area': '🇪🇺',
      'morocco': '🇲🇦',
      'sri lanka': '🇱🇰',
      'togo': '🇹🇬',
      'china': '🇨🇳',
      'japan': '🇯🇵',
      'singapore': '🇸🇬',
      'australia': '🇦🇺',
      'brazil': '🇧🇷',
      'mexico': '🇲🇽',
      'argentina': '🇦🇷',
      'chile': '🇨🇱',
      'peru': '🇵🇪',
      'colombia': '🇨🇴',
      'egypt': '🇪🇬',
      'jordan': '🇯🇴',
      'uae': '🇦🇪',
      'united arab emirates': '🇦🇪',
      'turkey': '🇹🇷',
      'greece': '🇬🇷',
      'cyprus': '🇨🇾',
      'russia': '🇷🇺',
      'ukraine': '🇺🇦',
      'poland': '🇵🇱',
      'germany': '🇩🇪',
      'france': '🇫🇷',
      'spain': '🇪🇸',
      'italy': '🇮🇹',
      'netherlands': '🇳🇱',
      'belgium': '🇧🇪',
      'switzerland': '🇨🇭',
      'austria': '🇦🇹',
      'portugal': '🇵🇹',
      'sweden': '🇸🇪',
      'norway': '🇳🇴',
      'denmark': '🇩🇰',
      'finland': '🇫🇮',
    };
    
    return countryFlags[normalizedCountry] || '';
  }

  private getVisaTypeHebrew(docType: string, intent?: string): string {
    // Combine doc type and intent for more accurate translation
    const normalizedDocType = docType?.toLowerCase().trim();
    const normalizedIntent = intent?.toLowerCase().trim();

    // First check if we have a specific intent translation
    if (normalizedIntent && VISA_TYPES_HEBREW[normalizedIntent]) {
      const intentHebrew = VISA_TYPES_HEBREW[normalizedIntent];
      
      // Check validity if it's part of the doc type
      if (normalizedDocType?.includes('month') || normalizedDocType?.includes('year')) {
        const validity = this.extractValidity(normalizedDocType);
        const validityHebrew = VALIDITY_HEBREW[validity] || validity;
        return `${intentHebrew} ${validityHebrew}`;
      }
      
      return intentHebrew;
    }

    // Fall back to doc type translation
    if (VISA_TYPES_HEBREW[normalizedDocType]) {
      return VISA_TYPES_HEBREW[normalizedDocType];
    }

    // Try to extract type and validity separately
    for (const [key, value] of Object.entries(VISA_TYPES_HEBREW)) {
      if (normalizedDocType?.includes(key)) {
        // Check if there's also a validity period
        const validity = this.extractValidity(normalizedDocType);
        if (validity && VALIDITY_HEBREW[validity]) {
          return `${value} ${VALIDITY_HEBREW[validity]}`;
        }
        return value;
      }
    }

    // Default fallback
    return docType || 'ויזה';
  }

  private extractValidity(text: string): string {
    const normalizedText = text?.toLowerCase().trim();
    
    // Check for common validity patterns
    if (normalizedText?.includes('3month') || normalizedText?.includes('3 month')) {
      return '3months';
    }
    if (normalizedText?.includes('6month') || normalizedText?.includes('6 month')) {
      return '6months';
    }
    if (normalizedText?.includes('year')) {
      return 'year';
    }
    if (normalizedText?.includes('month')) {
      return 'month';
    }
    
    return '';
  }

  private calculateProcessingDays(order: OrderData): number {
    // Calculate processing time based on urgency and product type
    const isUrgent = order.urgency === 'urgent' || order.urgency === 'express';
    
    // Default processing times by country (in business days)
    const defaultProcessingTimes: Record<string, number> = {
      'india': 3,
      'usa': 5,
      'uk': 5,
      'canada': 7,
      'thailand': 2,
      'vietnam': 3,
      'schengen': 10,
      'china': 7,
      'japan': 5,
      'australia': 5,
      'default': 3,
    };

    const countryNormalized = order.product_country?.toLowerCase().trim();
    let baseDays = defaultProcessingTimes[countryNormalized] || defaultProcessingTimes['default'];

    // Reduce time for urgent processing
    if (isUrgent) {
      baseDays = Math.max(1, Math.floor(baseDays / 2));
    }

    // Use product_days_to_use if available and reasonable
    if (order.product_days_to_use && order.product_days_to_use > 0 && order.product_days_to_use <= 30) {
      baseDays = order.product_days_to_use;
    }

    return baseDays;
  }

  private async getOrderByOrderId(orderId: string): Promise<OrderData | null> {
    const { data, error } = await this.supabaseService.serviceClient
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch order ${orderId}:`, error);
      return null;
    }

    return data;
  }

  private async updateOrderWhatsAppStatus(orderId: string, messageId: string) {
    const { error } = await this.supabaseService.serviceClient
      .from('orders')
      .update({
        whatsapp_confirmation_sent: true,
        whatsapp_confirmation_sent_at: new Date().toISOString(),
        whatsapp_message_id: messageId,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    if (error) {
      this.logger.error(
        `Failed to update WhatsApp status for order ${orderId}:`,
        error,
      );
      throw error;
    } else {
      this.logger.log(
        `Updated WhatsApp status for order ${orderId}: sent=true, message_id=${messageId}`
      );
    }
  }
}