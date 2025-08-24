import { Injectable } from '@nestjs/common';
import { WhatsAppTranslationService } from './whatsapp-translation.service';

interface OrderData {
  order_id: string;
  client_name: string;
  client_email: string;
  product_country: string;
  product_doc_type: string | null;
  product_intent?: string | null;
  visa_quantity?: number | null;
  amount?: number;
  urgency?: string | null;
  product_days_to_use?: number | null;
}

export interface OrderConfirmationData {
  customerName: string;
  country: string;
  countryFlag: string;
  orderNumber: string;
  visaType: string;
  applicantCount: string;
  paymentAmount: string;
  processingDays: string;
}

@Injectable()
export class WhatsAppTemplateService {
  constructor(
    private readonly translationService: WhatsAppTranslationService,
  ) {}

  /**
   * Prepare data for order confirmation template
   */
  prepareOrderConfirmationData(order: OrderData): OrderConfirmationData {
    // Get Hebrew translations
    const countryHebrew = this.translationService.getCountryNameHebrew(order.product_country);
    const countryFlag = this.translationService.getCountryFlag(order.product_country);
    const visaTypeHebrew = this.translationService.getVisaTypeHebrew(
      order.product_doc_type ?? 'tourist',
      order.product_intent ?? undefined
    );
    const processingDays = this.translationService.calculateProcessingDays(
      order.product_country,
      order.urgency ?? undefined,
      order.product_days_to_use ?? undefined
    );

    // Return the data object for the template
    return {
      customerName: order.client_name,
      country: countryHebrew,
      countryFlag: countryFlag,
      orderNumber: order.order_id,
      visaType: visaTypeHebrew,
      applicantCount: String(order.visa_quantity || 1),
      paymentAmount: String(order.amount || 0),
      processingDays: processingDays // Already a string from translation service
    };
  }

  /**
   * Build status update message (placeholder for future template)
   * NOTE: This needs to be converted to a WhatsApp Business template
   */
  buildStatusUpdateMessage(order: OrderData): string {
    const countryHebrew = this.translationService.getCountryNameHebrew(order.product_country);
    
    return `שלום ${order.client_name},

עדכון לגבי הזמנה ${order.order_id} - ויזה ל${countryHebrew}:

הבקשה שלך בטיפול והכל מתקדם כמתוכנן ✅

נעדכן אותך ברגע שיהיו חדשות.

*צוות ויזה.נט* 🛂`;
  }

  /**
   * Build document ready message (placeholder for future template)
   * NOTE: This needs to be converted to a WhatsApp Business template
   */
  buildDocumentReadyMessage(order: OrderData): string {
    const countryHebrew = this.translationService.getCountryNameHebrew(order.product_country);
    
    return `שלום ${order.client_name},

חדשות טובות! 🎉

הויזה שלך ל${countryHebrew} מוכנה!
*מספר הזמנה*: ${order.order_id}

אנחנו שולחים לך את המסמכים למייל ${order.client_email}

תודה שבחרת בויזה.נט ונסיעה טובה! ✈️`;
  }

  /**
   * Get the appropriate template name for a message type
   */
  getTemplateName(messageType: string): string | null {
    const templateMap: Record<string, string> = {
      'order_confirmation': 'order_confirmation_global',
      'status_update': 'status_update', // To be created
      'document_ready': 'document_ready', // To be created
    };

    return templateMap[messageType] || null;
  }

  /**
   * Check if a message type has a template available
   */
  hasTemplate(messageType: string): boolean {
    // Currently only order_confirmation has a template
    return messageType === 'order_confirmation';
  }
}