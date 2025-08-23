import { Injectable, Logger } from '@nestjs/common';
import { CBBContactData } from '@visapi/shared-types';

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
  applicants_data?: any;
  cbb_synced?: boolean | null;
  cbb_contact_id?: string | null;
  whatsapp_confirmation_sent?: boolean | null;
  whatsapp_confirmation_sent_at?: string | null;
  whatsapp_message_id?: string | null;
}

/**
 * Service responsible for mapping order data to CBB contact fields
 * Handles field transformations, data extraction, and formatting
 */
@Injectable()
export class CBBFieldMapperService {
  private readonly logger = new Logger(CBBFieldMapperService.name);

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

    // Use actual product data from the order
    const visaIntent = order.product_intent || 'tourism';
    const visaEntries = order.product_entries || 'single';

    this.logger.debug(
      `Mapped order ${order.order_id}: intent=${visaIntent}, entries=${visaEntries}, validity=${visaValidityDays} days`,
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
    return urgency === 'urgent' || urgency === 'express';
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
  private extractGender(applicantsData: any, orderId: string): string | undefined {
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
}