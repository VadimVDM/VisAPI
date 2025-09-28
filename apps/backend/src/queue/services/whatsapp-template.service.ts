import { Injectable } from '@nestjs/common';
import { WhatsAppTranslationService } from './whatsapp-translation.service';
import { SupabaseService } from '@visapi/core-supabase';

interface OrderData {
  order_id: string;
  client_name: string;
  client_email: string;
  product_country: string;
  product_doc_type: string | null;
  product_intent?: string | null;
  product_entries?: string | null;
  product_validity?: string | null;
  visa_quantity?: number | null;
  amount?: number;
  urgency?: string | null;
  visa_validity_days?: number | null;
  processing_days?: number | null; // Processing time from Vizi API
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
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Prepare data for order confirmation template
   */
  async prepareOrderConfirmationData(
    order: OrderData,
  ): Promise<OrderConfirmationData> {
    // Try to get the translated visa type from cbb_contacts first
    let visaTypeHebrew: string;

    try {
      const { data: cbbContact } = await this.supabaseService.serviceClient
        .from('cbb_contacts')
        .select('visa_type_translated')
        .eq('order_id', order.order_id)
        .single();

      if (cbbContact?.visa_type_translated) {
        visaTypeHebrew = cbbContact.visa_type_translated;
      } else {
        // Fallback to direct translation
        visaTypeHebrew = this.translationService.getVisaTypeHebrew(
          order.product_doc_type ?? 'tourist',
          order.product_intent ?? undefined,
          order.product_country,
          order.product_entries || undefined,
          order.product_validity || undefined,
          order.visa_validity_days || undefined,
        );
      }
    } catch {
      // Fallback to direct translation if there's an error
      visaTypeHebrew = this.translationService.getVisaTypeHebrew(
        order.product_doc_type ?? 'tourist',
        order.product_intent ?? undefined,
        order.product_country,
        order.product_entries || undefined,
        order.product_validity || undefined,
        order.visa_validity_days || undefined,
      );
    }

    // Get Hebrew translations
    const countryHebrew = this.translationService.getCountryNameHebrew(
      order.product_country,
    );
    const countryFlag = this.translationService.getCountryFlag(
      order.product_country,
    );

    // Use processing_days directly from order (from Vizi API)
    const processingDays = this.translationService.getProcessingDays(
      order.processing_days ?? undefined,
    );

    // Return the data object for the template
    return {
      customerName: order.client_name,
      country: countryHebrew,
      countryFlag: countryFlag,
      orderNumber: order.order_id,
      visaType: visaTypeHebrew,
      applicantCount: String(order.visa_quantity || 1), // Just the number (template already includes ×)
      paymentAmount: String(order.amount || 0),
      processingDays: processingDays, // Processing days in business days
    };
  }

  /**
   * Build status update message (placeholder for future template)
   * NOTE: This needs to be converted to a WhatsApp Business template
   */
  buildStatusUpdateMessage(order: OrderData): string {
    const countryHebrew = this.translationService.getCountryNameHebrew(
      order.product_country,
    );

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
    const countryHebrew = this.translationService.getCountryNameHebrew(
      order.product_country,
    );

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
      order_confirmation: 'order_confirmation_global',
      visa_approval: 'visa_approval_file_phone', // Primary visa approval template
      status_update: 'status_update', // To be created
      document_ready: 'document_ready', // To be created
    };

    return templateMap[messageType] || null;
  }

  /**
   * Check if a message type has a template available
   */
  hasTemplate(messageType: string): boolean {
    // Templates that are currently implemented
    return messageType === 'order_confirmation' || messageType === 'visa_approval';
  }
}
