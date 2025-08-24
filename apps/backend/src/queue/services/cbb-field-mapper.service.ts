import { Injectable, Logger } from '@nestjs/common';
import { CBBContactData } from '@visapi/shared-types';
import { SupabaseService } from '@visapi/core-supabase';

interface PassportData {
  sex?: 'm' | 'f';
  [key: string]: unknown;
}

interface ApplicantData {
  passport?: PassportData;
  [key: string]: unknown;
}

interface OrderData {
  order_id: string;
  client_phone: string;
  client_name: string;
  client_email: string;
  product_country: string;
  product_doc_type: string | null;
  product_intent?: string | null;
  product_entries?: string | null;
  product_validity?: string | null;
  product_days_to_use?: number | null;
  visa_quantity: number | null;
  urgency: string | null;
  amount: number;
  currency: string;
  entry_date: string | null;
  branch: string;
  form_id: string;
  webhook_received_at: string;
  whatsapp_alerts_enabled: boolean | null;
  applicants_data?: ApplicantData[];
  processing_days?: number | null; // Calculated by business rules engine
}

interface CBBContactRecord {
  id: string;
  order_id: string;
  cbb_contact_id?: string;
  cbb_synced: boolean;
  cbb_sync_attempts: number;
  cbb_sync_error_count: number;
  cbb_sync_last_attempt_at?: Date;
  cbb_sync_last_error?: string;
  client_phone: string;
  client_email?: string;
  client_name?: string;
  product_country?: string;
  product_doc_type?: string;
  urgency?: string;
  processing_days?: number;
  language_code: string;
  country_name_translated?: string;
  visa_type_translated?: string;
  urgency_translated?: string;
  processing_days_translated?: string;
  branch?: string;
  order_days?: number;
}

/**
 * Service responsible for mapping order data to CBB contact fields
 * Handles field transformations, data extraction, and formatting
 * Now uses cbb_contacts table for storing CBB-related data
 */
@Injectable()
export class CBBFieldMapperService {
  private readonly logger = new Logger(CBBFieldMapperService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private readonly countryFlags: Record<string, string> = {
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
  };

  /**
   * Save or update CBB contact in database
   */
  async saveCBBContact(order: OrderData, translations: {
    countryNameTranslated?: string;
    visaTypeTranslated?: string;
    urgencyTranslated?: string;
    processingDaysTranslated?: string;
  } = {}): Promise<CBBContactRecord | null> {
    const language = this.mapBranchToLanguage(order.branch);
    const processingDays = order.processing_days || this.calculateDefaultProcessingDays(
      order.product_country,
      order.urgency ?? 'normal'
    );

    const contactData = {
      order_id: order.order_id,
      client_phone: order.client_phone,
      client_email: order.client_email,
      client_name: order.client_name,
      product_country: order.product_country,
      product_doc_type: order.product_doc_type,
      urgency: order.urgency,
      processing_days: processingDays,
      language_code: language === 'Hebrew' ? 'he' : language === 'Russian' ? 'ru' : 'en',
      country_name_translated: translations.countryNameTranslated,
      visa_type_translated: translations.visaTypeTranslated,
      urgency_translated: translations.urgencyTranslated,
      processing_days_translated: translations.processingDaysTranslated,
      branch: order.branch,
      order_days: processingDays,
      cbb_synced: false,
      cbb_sync_attempts: 0,
      cbb_sync_error_count: 0
    };

    const { data, error } = await this.supabaseService.serviceClient
      .from('cbb_contacts')
      .upsert(contactData, { onConflict: 'order_id' })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to save CBB contact for order ${order.order_id}:`, error);
      return null;
    }

    return data as unknown as CBBContactRecord;
  }

  /**
   * Get CBB contact from database
   */
  async getCBBContact(orderId: string): Promise<CBBContactRecord | null> {
    const { data, error } = await this.supabaseService.serviceClient
      .from('cbb_contacts')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      this.logger.error(`Failed to get CBB contact for order ${orderId}:`, error);
    }

    return data as CBBContactRecord | null;
  }

  /**
   * Update CBB sync status
   */
  async updateCBBSyncStatus(orderId: string, updates: {
    cbb_contact_id?: string;
    cbb_synced?: boolean;
    cbb_sync_attempts?: number;
    cbb_sync_error_count?: number;
    cbb_sync_last_attempt_at?: Date;
    cbb_sync_last_error?: string | null;
  }): Promise<void> {
    // Convert Date to ISO string for Supabase
    const updateData: any = { ...updates };
    if (updates.cbb_sync_last_attempt_at) {
      updateData.cbb_sync_last_attempt_at = updates.cbb_sync_last_attempt_at.toISOString();
    }
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const { error } = await this.supabaseService.serviceClient
      .from('cbb_contacts')
      .update(updateData)
      .eq('order_id', orderId);

    if (error) {
      this.logger.error(`Failed to update CBB sync status for order ${orderId}:`, error);
    }
  }

  /**
   * Map order data to CBB contact format
   */
  mapOrderToContact(order: OrderData): CBBContactData {
    const isUrgent = this.isOrderUrgent(order.urgency ?? 'normal');
    const orderDateUnix = this.convertDateToUnix(order.entry_date ?? '', order.order_id);
    const gender = this.extractGender(order.applicants_data, order.order_id);
    const language = this.mapBranchToLanguage(order.branch);
    const countryFlag = this.getCountryFlag(order.product_country);
    const visaValidityDays = this.calculateVisaValidityDays(
      order.product_validity ?? undefined,
      order.product_days_to_use ?? undefined,
    );
    
    // Use processing_days from database (calculated by business rules engine)
    // If not available, calculate based on urgency
    const processingDays = order.processing_days || this.calculateDefaultProcessingDays(
      order.product_country,
      order.urgency ?? 'normal'
    );

    // Use actual product data from the order
    const visaIntent = order.product_intent || 'tourism';
    const visaEntries = order.product_entries || 'single';

    this.logger.debug(
      `Mapped order ${order.order_id}: intent=${visaIntent}, entries=${visaEntries}, validity=${visaValidityDays} days, processing=${processingDays} days`,
    );

    return {
      id: order.client_phone,
      phone: order.client_phone,
      name: order.client_name,
      email: order.client_email,
      gender: gender,
      language: language,
      cufs: this.buildCustomFields(order, {
        isUrgent,
        orderDateUnix,
        visaIntent,
        visaEntries,
        visaValidityDays,
        countryFlag,
        processingDays,
      }),
    };
  }

  /**
   * Build CBB custom fields object
   */
  private buildCustomFields(
    order: OrderData,
    computed: {
      isUrgent: boolean;
      orderDateUnix?: number;
      visaIntent: string;
      visaEntries: string;
      visaValidityDays: string;
      countryFlag: string;
      processingDays: number;
    },
  ): Record<string, any> {
    return {
      // Text fields (type 0)
      customer_name: order.client_name,
      visa_country: order.product_country,
      visa_type: order.product_doc_type || 'tourist',
      OrderNumber: order.order_id,

      // Number fields (type 1)
      visa_quantity: order.visa_quantity || 1,
      order_days: computed.processingDays, // Processing days for WhatsApp template

      // Boolean field (type 4) - CBB expects 1 for true, 0 for false
      order_urgent: computed.isUrgent ? 1 : 0,

      // Additional order information
      order_priority: order.urgency || 'standard',

      // Date field (type 2) expects Unix timestamp in seconds
      order_date: computed.orderDateUnix,

      // Visa fields using actual product data
      visa_intent: computed.visaIntent,
      visa_entries: computed.visaEntries,
      visa_validity: computed.visaValidityDays,
      visa_flag: computed.countryFlag,

      // System fields
      Email: order.client_email, // System field ID -12
    };
  }

  /**
   * Determine if order is urgent
   */
  private isOrderUrgent(urgency: string): boolean {
    const urgentValues = ['urgent', 'express', 'few_hours', 'next_day', 'rush', 'priority'];
    return urgentValues.includes(urgency.toLowerCase());
  }

  /**
   * Convert date string to Unix timestamp in seconds
   */
  private convertDateToUnix(dateString: string, orderId: string): number | undefined {
    if (!dateString) {
      return undefined;
    }

    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const unixTimestamp = Math.floor(date.getTime() / 1000);
        this.logger.debug(
          `Converted entry_date ${dateString} to Unix timestamp: ${unixTimestamp} for order ${orderId}`,
        );
        return unixTimestamp;
      }
    } catch (_error) {
      this.logger.warn(
        `Failed to convert entry_date to Unix timestamp: ${dateString} for order ${orderId}`,
      );
    }

    return undefined;
  }

  /**
   * Extract gender from applicant passport data
   */
  private extractGender(applicantsData: ApplicantData[] | undefined, orderId: string): string | undefined {
    if (!applicantsData || !Array.isArray(applicantsData) || !applicantsData[0]) {
      return undefined;
    }

    const firstApplicant = applicantsData[0];
    if (firstApplicant.passport?.sex) {
      // Convert passport sex (m/f) to CBB gender format
      const gender =
        firstApplicant.passport.sex === 'm'
          ? 'male'
          : firstApplicant.passport.sex === 'f'
            ? 'female'
            : undefined;
      
      this.logger.debug(
        `Extracted gender for ${orderId}: ${gender} from passport sex: ${firstApplicant.passport.sex}`,
      );
      
      return gender;
    }

    return undefined;
  }

  /**
   * Map branch code to language
   */
  private mapBranchToLanguage(branch?: string): string | undefined {
    switch (branch?.toLowerCase()) {
      case 'il':
        return 'Hebrew';
      case 'ru':
        return 'Russian';
      case 'se':
        return 'Swedish';
      case 'co':
      default:
        // For CO (Colombia) and other branches, use English
        return 'English US';
    }
  }

  /**
   * Get country flag emoji
   */
  private getCountryFlag(country: string): string {
    const normalizedCountry = country?.toLowerCase().trim();
    return this.countryFlags[normalizedCountry] || '';
  }

  /**
   * Calculate visa validity in days
   */
  private calculateVisaValidityDays(
    validity?: string,
    daysToUse?: number,
  ): string {
    if (daysToUse) {
      return String(daysToUse);
    }

    switch (validity) {
      case 'month':
        return '30';
      case 'year':
        return '365';
      case '3months':
        return '90';
      case '6months':
        return '180';
      default:
        return '30'; // Default to 30 days
    }
  }

  /**
   * Calculate default processing days based on business rules
   * This is a fallback when processing_days is not set in the order
   */
  private calculateDefaultProcessingDays(
    country: string,
    urgency: string
  ): number {
    const isUrgent = urgency === 'urgent' || urgency === 'express';
    
    // If urgent, always 1 business day
    if (isUrgent) {
      return 1;
    }

    // Country-specific processing times (based on requirements)
    const countryNormalized = country?.toLowerCase().trim();
    switch (countryNormalized) {
      case 'morocco':
        return 5;
      case 'vietnam':
        return 7;
      default:
        return 3; // Default for all other countries
    }
  }
}