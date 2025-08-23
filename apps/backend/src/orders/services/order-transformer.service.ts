import { Injectable, Logger } from '@nestjs/common';
import { ViziWebhookDto } from '@visapi/visanet-types';
import { Json } from '@visapi/shared-types';
import { CreateOrderData } from '@visapi/backend-repositories';
import { TranslationService } from './translation.service';

@Injectable()
export class OrderTransformerService {
  private readonly logger = new Logger(OrderTransformerService.name);

  constructor(private readonly translationService: TranslationService) {}

  /**
   * Transform Vizi webhook data to order format
   */
  transformWebhookToOrder(webhook: ViziWebhookDto): CreateOrderData {
    const { form, order } = webhook;

    // Extract face and passport URLs from first applicant's files
    const firstApplicant = form.applicants?.[0] as unknown;
    const applicantFiles =
      (firstApplicant as { files?: Record<string, unknown> })?.files || {};
    const faceUrl = applicantFiles.face || null;
    const passportUrl = applicantFiles.passport || null;

    // Create files_data without face and passport (those are in dedicated columns)
    const otherFiles = { ...applicantFiles };
    delete otherFiles.face;
    delete otherFiles.passport;

    // Get translations for Hebrew fields
    const translations = this.translationService.translateOrderData({
      country: form.product?.country || form.country,
      docType: form.product?.docType,
      intent: form.product?.intent,
      urgency: form.urgency,
    });

    // Transform the data
    const orderData: CreateOrderData = {
      // Order core data
      order_id: order.id,
      form_id: order.form_id || form.id || order.id,
      branch: order.branch || this.extractBranchFromOrderId(order.id),
      domain: order.domain || 'visanet.app',
      payment_processor: order.payment_processor || 'stripe',
      payment_id: order.payment_id || `pending_${order.id}`,
      amount: order.amount !== undefined ? order.amount : 0,
      currency: order.currency || this.getCurrencyForCountry(form.country),
      order_status: order.status || 'pending',

      // Client information (with phone transformation)
      client_name: form.client?.name || 'Unknown',
      client_email: form.client?.email || 'unknown@example.com',
      client_phone: this.transformPhoneNumber(form.client?.phone),
      whatsapp_alerts_enabled: form.client?.whatsappAlertsEnabled || false,

      // Product details
      product_name: form.product?.name || `${form.country} Visa`,
      product_country: form.product?.country || form.country || 'unknown',
      product_doc_type: form.product?.docType,
      product_doc_name: form.product?.docName,
      product_intent: form.product?.intent || 'tourism',
      product_entries: form.product?.entries || 'single',
      product_validity: form.product?.validity || 'month',
      product_days_to_use: form.product?.days_to_use || 30,

      // Translation fields (stored for optimization)
      product_country_hebrew: translations.countryHebrew,
      product_country_flag: translations.countryFlag,
      visa_type_hebrew: translations.visaTypeHebrew,
      processing_days_hebrew: translations.processingDays,
      urgency_hebrew: translations.urgencyHebrew,

      // Visa details
      visa_quantity: form.quantity || 1,
      entry_date: this.parseEntryDate(
        (
          (form as unknown as Record<string, unknown>).entry as {
            date?: unknown;
          }
        )?.date,
      ),
      urgency: form.urgency || 'standard',
      file_transfer_method: (form as unknown as Record<string, unknown>)
        .fileTransferMethod as string | undefined,

      // Entry information
      entry_port: (
        (form as unknown as Record<string, unknown>).entry as { port?: string }
      )?.port,
      entry_type: (
        (form as unknown as Record<string, unknown>).entry as {
          crossing?: { type?: string };
        }
      )?.crossing?.type,

      // Document URLs
      face_url: faceUrl as string | undefined,
      passport_url: passportUrl as string | undefined,

      // Categorized JSON data
      passport_data: form.applicants?.[0]?.passport || null,
      extra_nationality_data:
        (firstApplicant as { extraNationality?: Json })?.extraNationality ||
        null,
      address_data: {
        personal: (firstApplicant as { address?: Json })?.address,
        work: (
          (firstApplicant as { occupation?: Json })?.occupation as {
            address?: Json;
          }
        )?.address,
      } as Json,
      family_data: (firstApplicant as { family?: Json })?.family || null,
      occupation_data:
        (firstApplicant as { occupation?: Json })?.occupation || null,
      military_data: (firstApplicant as { military?: Json })?.military || null,
      past_travels_data:
        (firstApplicant as { pastTravels?: Json })?.pastTravels || null,
      emergency_contact_data: (form as unknown as Record<string, unknown>)
        ?.emergencyContact as Json | null,
      business_data: (form as unknown as Record<string, unknown>)
        ?.business as Json | null,
      files_data:
        Object.keys(otherFiles).length > 0 ? (otherFiles as Json) : null,
      coupon_data: (order.coupon || form.discount) as Json | null,
      form_meta_data: form.meta || null,
      applicants_data: (form.applicants || []) as unknown as Json,
      extra_data: this.extractExtraFields(form as unknown as Json),

      // Tracking
      webhook_received_at: new Date().toISOString(),
    };

    return orderData;
  }

  /**
   * Transform phone number from object to string format
   * { code: "+44", number: "1234567890" } => "441234567890"
   */
  private transformPhoneNumber(
    phone: { code: string; number: string } | string | undefined,
  ): string {
    try {
      if (!phone) {
        return '0000000000'; // Fallback for missing phone
      }

      if (typeof phone === 'string') {
        // Already a string, just clean it
        return phone.replace(/^\+/, '').replace(/\D/g, '') || '0000000000';
      }

      if (!phone.code || !phone.number) {
        return '0000000000'; // Fallback for missing phone parts
      }

      // Remove + from country code and all non-digits from number
      const cleanCode = (phone.code || '')
        .replace(/^\+/, '')
        .replace(/\D/g, '');
      const cleanNumber = (phone.number || '').replace(/\D/g, '');

      if (!cleanCode || !cleanNumber) {
        return '0000000000';
      }

      return `${cleanCode}${cleanNumber}`;
    } catch {
      this.logger.warn(
        `Failed to transform phone number: ${JSON.stringify(phone)}, using fallback`,
      );
      return '0000000000';
    }
  }

  /**
   * Parse entry date safely
   */
  private parseEntryDate(date: unknown): string | undefined {
    if (!date) {
      return undefined;
    }

    try {
      // Handle various date formats
      const parsedDate = new Date(date as string | number | Date);
      if (isNaN(parsedDate.getTime())) {
        this.logger.warn(`Invalid entry date format: ${typeof date === 'object' ? JSON.stringify(date) : String(date)}`);
        return undefined;
      }
      return parsedDate.toISOString();
    } catch {
      this.logger.warn(`Failed to parse entry date: ${typeof date === 'object' ? JSON.stringify(date) : String(date)}`);
      return undefined;
    }
  }

  /**
   * Extract branch code from order ID
   */
  private extractBranchFromOrderId(orderId: string): string {
    // Order IDs like "IL250819GB16" - first 2 chars are branch
    if (!orderId || orderId.length < 2) {
      return 'il'; // Default to 'il' which is a valid branch code
    }
    const extracted = orderId.substring(0, 2).toLowerCase();

    // Map to valid branch codes
    const validBranches = ['se', 'co', 'il', 'ru', 'kz'];
    if (validBranches.includes(extracted)) {
      return extracted;
    }

    // Default to 'il' if not a recognized branch
    return 'il';
  }

  /**
   * Get currency for country
   */
  private getCurrencyForCountry(country: string): string {
    const currencyMap: Record<string, string> = {
      uk: 'GBP',
      gb: 'GBP',
      usa: 'USD',
      us: 'USD',
      canada: 'CAD',
      ca: 'CAD',
      india: 'INR',
      in: 'INR',
      israel: 'ILS',
      il: 'ILS',
      vietnam: 'VND',
      vn: 'VND',
      korea: 'KRW',
      kr: 'KRW',
      morocco: 'MAD',
      ma: 'MAD',
      saudi_arabia: 'SAR',
      sa: 'SAR',
      schengen: 'EUR',
      eu: 'EUR',
    };
    return currencyMap[country?.toLowerCase()] || 'USD';
  }

  /**
   * Extract fields not in standard structure
   */
  private extractExtraFields(form: Json): Json {
    // Only process if form is an object
    if (!form || typeof form !== 'object' || Array.isArray(form)) {
      return null;
    }

    const formObj = form as { [key: string]: Json | undefined };
    const standardFields = [
      'id',
      'country',
      'client',
      'product',
      'quantity',
      'urgency',
      'discount',
      'termsAgreed',
      'orderId',
      'meta',
      'entry',
      'business',
      'applicants',
      'fileTransferMethod',
      'emergencyContact',
    ];

    const extraFields: { [key: string]: Json | undefined } = {
      termsAgreed: formObj.termsAgreed,
      orderId: formObj.orderId,
    };

    // Add any non-standard fields
    for (const key in formObj) {
      if (!standardFields.includes(key)) {
        extraFields[key] = formObj[key];
      }
    }

    return Object.keys(extraFields).length > 0 ? extraFields : null;
  }
}