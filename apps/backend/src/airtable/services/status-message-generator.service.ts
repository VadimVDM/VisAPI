import { Injectable } from '@nestjs/common';
import { WhatsAppTranslationService } from '../../queue/services/whatsapp-translation.service';

interface OrderFields {
  Status?: string;
  'Domain Branch'?: string;
  ID?: string;
  Email?: string;
  Phone?: string;
  Country?: string;
  Type?: string;
  Intent?: string;
  'Entry Count'?: string;
  Validity?: string;
  Priority?: string;
  'Processing Time'?: number;
}

type StatusType = 'active' | 'processing' | 'completed' | 'failed';

interface StatusMessageTemplate {
  check: (status: string) => boolean;
  generate: (context: MessageContext) => string[];
}

interface MessageContext {
  visaTypeHebrew: string;
  countryHebrew: string;
  countryFlag: string;
  processingDays: string;
  orderId: string;
  // Add more context as needed for future templates
}

@Injectable()
export class StatusMessageGeneratorService {
  private readonly statusTemplates: Map<StatusType, StatusMessageTemplate>;

  constructor(
    private readonly translationService: WhatsAppTranslationService,
  ) {
    // Initialize message templates for different statuses
    this.statusTemplates = new Map([
      ['active', {
        check: (status: string) => status?.toLowerCase().includes('active'),
        generate: (ctx: MessageContext) => [
          '*סטטוס עדכני: הבקשה ממתינה לאישור* ⏳',
          '',
          `בקשתכם עבור ${ctx.visaTypeHebrew} ל${ctx.countryHebrew} הוגשה בהצלחה ונמצאת כעת בטיפול מול הרשויות הממשלתיות ב${ctx.countryHebrew} ${ctx.countryFlag}`,
          '',
          `בדרך כלל התהליך נמשך עד ${ctx.processingDays} ימי עסקים.`,
          '',
          'נעדכן אתכם כאן בוואטסאפ ובמייל מיד עם קבלת האישור.',
        ],
      }],
      // Add more status templates here in the future
      ['processing', {
        check: (status: string) => status?.toLowerCase().includes('processing'),
        generate: (ctx: MessageContext) => [
          '*סטטוס עדכני: בקשתכם בטיפול* 🔄',
          '',
          `הבקשה שלכם ל${ctx.visaTypeHebrew} ל${ctx.countryHebrew} נמצאת כעת בטיפול פעיל ${ctx.countryFlag}`,
          '',
          'נעדכן אתכם ברגע שיהיה עדכון נוסף.',
        ],
      }],
      ['completed', {
        check: (status: string) => status?.toLowerCase().includes('completed'),
        generate: (ctx: MessageContext) => [
          '*סטטוס עדכני: הבקשה אושרה!* ✅',
          '',
          `ה${ctx.visaTypeHebrew} שלכם ל${ctx.countryHebrew} ${ctx.countryFlag} אושרה בהצלחה!`,
          '',
          'המסמכים נשלחו אליכם במייל.',
        ],
      }],
    ]);
  }

  /**
   * Generate a formatted WhatsApp status message based on order status
   * Returns null if no applicable template or not IL domain
   */
  async generateStatusMessage(fields: OrderFields): Promise<string | null> {
    // Only generate messages for IL domain
    const domainBranch = fields['Domain Branch'];
    if (domainBranch !== 'IL 🇮🇱') {
      return null;
    }

    const status = fields['Status'];
    if (!status) {
      return null;
    }

    // Find matching template
    const template = this.findMatchingTemplate(status);
    if (!template) {
      return null;
    }

    // Build context for message generation
    const context = await this.buildMessageContext(fields);

    // Generate message lines
    const messageLines = template.generate(context);

    // Join lines with actual newlines (not \n), preserving empty lines for spacing
    const formattedMessage = messageLines.join('\n');

    return formattedMessage;
  }

  /**
   * Find the appropriate template based on status
   */
  private findMatchingTemplate(status: string): StatusMessageTemplate | null {
    for (const [, template] of this.statusTemplates) {
      if (template.check(status)) {
        return template;
      }
    }
    return null;
  }

  /**
   * Build context object with all necessary translations
   */
  private async buildMessageContext(fields: OrderFields): Promise<MessageContext> {
    // Extract fields with defaults
    // Strip emoji and trim country name (e.g., "India 🇮🇳" -> "India")
    const countryRaw = fields['Country'] || 'Unknown';
    const country = countryRaw.toString().replace(/\s*[\u{1F1E6}-\u{1F1FF}]+\s*$/gu, '').trim();
    const visaType = fields['Type'] || 'Visa';
    const intent = fields['Intent'] || 'Tourism';
    const validity = fields['Validity'] || '30 Days';
    const priority = fields['Priority']?.toLowerCase() || 'regular';
    const processingTime = fields['Processing Time'] || 3;
    const orderId = fields['ID'] || '';

    // Get Hebrew translations
    const countryHebrew = this.translationService.getCountryNameHebrew(country);
    // Try to extract flag from original string, or get from translation service
    const countryFlag = countryRaw.toString().match(/[\u{1F1E6}-\u{1F1FF}]+/gu)?.[0] || this.translationService.getCountryFlag(country);

    // Get Hebrew visa type
    const visaTypeHebrew = this.translationService.getVisaTypeHebrew(
      visaType,
      intent,
      country,
      fields['Entry Count'],
      validity,
    );

    // Calculate processing days
    const processingDays = await this.translationService.calculateProcessingDays(
      country,
      priority,
      processingTime,
    );

    return {
      visaTypeHebrew,
      countryHebrew,
      countryFlag,
      processingDays,
      orderId,
    };
  }
}