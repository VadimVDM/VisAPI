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

    // Determine urgency status early (needed for processing days calculation)
    const isUrgent = this.isUrgentOrder(form.urgency);

    // Calculate processing days with urgency and country-specific rules
    const productCountry = (
      form.product?.country ||
      form.country ||
      'unknown'
    ).toLowerCase();
    const processingDays = this.calculateProcessingDays(
      form.product?.wait,
      productCountry,
      isUrgent,
    );

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

      // Product details (keeping for backward compatibility - will be removed)
      product_country: form.product?.country || form.country || 'unknown',
      product_doc_type: form.product?.docType,
      product_doc_name: form.product?.docName,
      product_intent: form.product?.intent || 'tourism',
      product_entries: form.product?.entries || 'single',
      product_validity: form.product?.validity || 'month',

      // Visa validity fields (FIXED: was incorrectly using days_to_use)
      // NOTE: days_to_use from Vizi webhook often has incorrect values
      // We parse product.validity string instead (e.g., "6_months" → 180 days)
      visa_usage_deadline_days: form.product?.days_to_use || 30, // Kept for reference but NOT used for validity
      visa_document_validity_days: this.parseValidityToDays(
        form.product?.validity || 'month',
      ),

      // Processing days with urgency and country-specific rules applied
      processing_days: processingDays,

      // Translation fields (stored for optimization)
      product_country_flag: translations.countryFlag,

      // Visa details
      visa_quantity: form.quantity || 1,
      entry_date: this.parseEntryDate(
        (
          (form as unknown as Record<string, unknown>).entry as {
            date?: unknown;
          }
        )?.date,
      ),
      is_urgent: isUrgent,
      file_transfer_method: (form as unknown as Record<string, unknown>)
        .fileTransferMethod as string | undefined,

      // Entry information
      entry_port: (
        (form as unknown as Record<string, unknown>).entry as { port?: string }
      )?.port,
      visa_entries: form.product?.entries || 'single',

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

      // New consolidated product data
      product_data: {
        name: form.product?.name || `${form.country} Visa`,
        country: form.product?.country || form.country || 'unknown',
        doc_type: form.product?.docType,
        doc_name: form.product?.docName,
        intent: form.product?.intent || 'tourism',
        entries: form.product?.entries || 'single',
        validity: form.product?.validity || 'month',
        days_to_use: form.product?.days_to_use || 30,
        urgency: this.normalizeUrgency(form.urgency),
        urgencies: form.product?.urgencies,
        price: form.product?.price,
        wait: form.product?.wait,
        instructions: form.product?.instructions,
        stay_limit: form.product?.stay_limit,
        photo_types: form.product?.photo_types,
        variations: form.product?.variations,
      } as Json,

      // Tracking
      webhook_received_at: new Date().toISOString(),
    };

    return orderData;
  }

  /**
   * Transform phone number from object to string format
   * { code: "+44", number: "1234567890" } => "441234567890"
   * Handles cases where number field already includes country code
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
      let cleanNumber = (phone.number || '').replace(/\D/g, '');

      // Remove leading zero from the phone number if present
      // This handles cases where local format includes leading zero
      if (cleanNumber.startsWith('0')) {
        cleanNumber = cleanNumber.substring(1);
      }

      if (!cleanCode || !cleanNumber) {
        return '0000000000';
      }

      // Check if number already starts with country code (after zero removal)
      // This prevents duplicate country codes like "972972544978750"
      if (cleanNumber.startsWith(cleanCode)) {
        this.logger.debug(
          `Phone number already includes country code ${cleanCode}: ${cleanNumber}`,
        );
        return cleanNumber;
      }

      // Concatenate code + number only if code not already present
      const result = `${cleanCode}${cleanNumber}`;
      this.logger.debug(
        `Transformed phone from code=${phone.code}, number=${phone.number} to ${result}`,
      );
      return result;
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
        let dateStr: string;
        if (typeof date === 'object' && date !== null) {
          dateStr = JSON.stringify(date);
        } else if (date != null && typeof date !== 'object') {
          dateStr = String(date as string | number | boolean);
        } else {
          dateStr = 'unknown';
        }
        this.logger.warn(`Invalid entry date format: ${dateStr}`);
        return undefined;
      }
      return parsedDate.toISOString();
    } catch {
      let dateStr: string;
      if (typeof date === 'object' && date !== null) {
        dateStr = JSON.stringify(date);
      } else if (date != null && typeof date !== 'object') {
        dateStr = String(date as string | number | boolean);
      } else {
        dateStr = 'unknown';
      }
      this.logger.warn(`Failed to parse entry date: ${dateStr}`);
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
   * Normalize urgency value to standard format
   * Maps various urgency values to standardized ones
   */
  private normalizeUrgency(urgency: string | undefined): string {
    if (!urgency) {
      return 'standard';
    }

    const normalized = urgency.toLowerCase().trim();

    // Map common variations to standard values
    switch (normalized) {
      case 'none':
      case 'normal':
      case 'regular':
      case 'standard':
        return 'standard';

      case 'urgent':
      case 'express':
      case 'rush':
      case 'priority':
      case 'next_day':
      case 'few_hours':
        return 'urgent';

      default:
        this.logger.warn(
          `Unknown urgency value '${urgency}', defaulting to 'standard'`,
        );
        return 'standard';
    }
  }

  /**
   * Determine if order is urgent
   */
  private isUrgentOrder(urgency: string | undefined): boolean {
    if (!urgency) {
      return false;
    }

    const urgentValues = [
      'urgent',
      'express',
      'few_hours',
      'next_day',
      'rush',
      'priority',
    ];
    return urgentValues.includes(urgency.toLowerCase().trim());
  }

  /**
   * Calculate processing days based on urgency and country-specific rules
   * Priority: Urgency > Webhook Value > Country-Specific > Default
   *
   * Rules (as per CLAUDE.md):
   * - Urgent orders: 1 day (overrides everything)
   * - Morocco: 5 days (if not urgent and no webhook value)
   * - Vietnam: 7 days (if not urgent and no webhook value)
   * - Default: 3 days (if not urgent, no webhook value, and not special country)
   */
  private calculateProcessingDays(
    webhookWait: number | undefined,
    country: string,
    isUrgent: boolean,
  ): number {
    // Priority 1: Urgent orders always get 1 day processing
    if (isUrgent) {
      this.logger.debug(
        `Order is urgent, setting processing days to 1 (was: ${webhookWait || 'not provided'})`,
      );
      return 1;
    }

    // Priority 2: Use webhook value if provided (product.wait from Vizi)
    if (webhookWait && webhookWait > 0) {
      this.logger.debug(
        `Using processing days from webhook: ${webhookWait} for country: ${country}`,
      );
      return webhookWait;
    }

    // Priority 3: Country-specific defaults
    const normalizedCountry = country.toLowerCase().trim();

    // Morocco: 5 days
    if (normalizedCountry === 'morocco' || normalizedCountry === 'ma') {
      this.logger.debug(`Morocco visa - using 5 days processing time`);
      return 5;
    }

    // Vietnam: 7 days
    if (normalizedCountry === 'vietnam' || normalizedCountry === 'vn') {
      this.logger.debug(`Vietnam visa - using 7 days processing time`);
      return 7;
    }

    // Priority 4: Default to 3 days
    this.logger.debug(
      `No specific rules for country ${country}, using default 3 days`,
    );
    return 3;
  }

  /**
   * Parse validity string to days
   * Converts formats like "6_months", "2_years" to days (180, 730)
   *
   * @param validity - Validity string from product.validity
   * @returns Number of days, or undefined if invalid
   */
  private parseValidityToDays(
    validity: string | undefined,
  ): number | undefined {
    if (!validity) {
      return undefined;
    }

    // Normalize: lowercase, trim, remove all underscores
    const normalized = validity.toLowerCase().trim().replace(/_/g, '');

    // Map validity strings to days
    switch (normalized) {
      // Weeks
      case '2weeks':
      case '15days':
        return 14;

      // Months
      case 'month':
      case '1month':
        return 30;
      case '2months':
        return 60;
      case '3months':
        return 90;
      case '6months':
        return 180;

      // Years
      case 'year':
      case '1year':
        return 365;
      case '2years':
        return 730;
      case '3years':
        return 1095;
      case '5years':
        return 1825;
      case '10years':
        return 3650;

      default:
        // Log unrecognized format for monitoring
        this.logger.warn(
          `Unrecognized validity format: "${validity}" (normalized: "${normalized}") - returning undefined`,
        );
        return undefined;
    }
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
