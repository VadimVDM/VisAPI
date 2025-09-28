import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';

// Hebrew translation maps
const COUNTRY_NAMES_HEBREW: Record<string, string> = {
  india: 'הודו',
  usa: 'ארה"ב',
  us: 'ארה"ב',
  'united states': 'ארה"ב',
  'u.s.': 'ארה"ב',
  uk: 'בריטניה',
  'united kingdom': 'בריטניה',
  britain: 'בריטניה',
  canada: 'קנדה',
  israel: 'ישראל',
  thailand: 'תאילנד',
  'south korea': 'דרום קוריאה',
  korea: 'קוריאה',
  vietnam: 'וייטנאם',
  'saudi arabia': 'ערב הסעודית',
  saudi: 'סעודיה',
  indonesia: 'אינדונזיה',
  bahrain: 'בחריין',
  'new zealand': 'ניו זילנד',
  cambodia: 'קמבודיה',
  schengen: 'אזור שנגן',
  'schengen area': 'אזור שנגן',
  morocco: 'מרוקו',
  'sri lanka': 'סרי לנקה',
  togo: 'טוגו',
  china: 'סין',
  japan: 'יפן',
  singapore: 'סינגפור',
  australia: 'אוסטרליה',
  brazil: 'ברזיל',
  mexico: 'מקסיקו',
  argentina: 'ארגנטינה',
  chile: "צ'ילה",
  peru: 'פרו',
  colombia: 'קולומביה',
  egypt: 'מצרים',
  jordan: 'ירדן',
  uae: 'איחוד האמירויות',
  'united arab emirates': 'איחוד האמירויות',
  turkey: 'טורקיה',
  greece: 'יוון',
  cyprus: 'קפריסין',
  russia: 'רוסיה',
  ukraine: 'אוקראינה',
  poland: 'פולין',
  germany: 'גרמניה',
  france: 'צרפת',
  spain: 'ספרד',
  italy: 'איטליה',
  netherlands: 'הולנד',
  belgium: 'בלגיה',
  switzerland: 'שוויץ',
  austria: 'אוסטריה',
  portugal: 'פורטוגל',
  sweden: 'שוודיה',
  norway: 'נורבגיה',
  denmark: 'דנמרק',
  finland: 'פינלנד',
};

const VISA_TYPES_HEBREW: Record<string, string> = {
  tourist: 'תיירות',
  tourism: 'תיירות',
  business: 'עסקים',
  general: 'כללי', // Tourism + Business
  student: 'סטודנט',
  evisa: 'ויזה אלקטרונית',
  'e-visa': 'ויזה אלקטרונית',
  eta: 'אישור נסיעה',
  voa: 'ויזה בהגעה',
  transit: 'מעבר',
  medical: 'רפואית',
  work: 'עבודה',
  conference: 'כנס',
  family: 'משפחה',
  pilgrimage: 'עלייה לרגל',
  diplomatic: 'דיפלומטית',
  official: 'רשמית',
  multiple: 'רב כניסות',
  single: 'כניסה יחידה',
};



const COUNTRY_FLAGS: Record<string, string> = {
  india: '🇮🇳',
  usa: '🇺🇸',
  us: '🇺🇸',
  'united states': '🇺🇸',
  'u.s.': '🇺🇸',
  uk: '🇬🇧',
  'united kingdom': '🇬🇧',
  britain: '🇬🇧',
  canada: '🇨🇦',
  israel: '🇮🇱',
  thailand: '🇹🇭',
  'south korea': '🇰🇷',
  korea: '🇰🇷',
  vietnam: '🇻🇳',
  'saudi arabia': '🇸🇦',
  saudi: '🇸🇦',
  indonesia: '🇮🇩',
  bahrain: '🇧🇭',
  'new zealand': '🇳🇿',
  cambodia: '🇰🇭',
  schengen: '🇪🇺',
  'schengen area': '🇪🇺',
  morocco: '🇲🇦',
  'sri lanka': '🇱🇰',
  togo: '🇹🇬',
  china: '🇨🇳',
  japan: '🇯🇵',
  singapore: '🇸🇬',
  australia: '🇦🇺',
  brazil: '🇧🇷',
  mexico: '🇲🇽',
  argentina: '🇦🇷',
  chile: '🇨🇱',
  peru: '🇵🇪',
  colombia: '🇨🇴',
  egypt: '🇪🇬',
  jordan: '🇯🇴',
  uae: '🇦🇪',
  'united arab emirates': '🇦🇪',
  turkey: '🇹🇷',
  greece: '🇬🇷',
  cyprus: '🇨🇾',
  russia: '🇷🇺',
  ukraine: '🇺🇦',
  poland: '🇵🇱',
  germany: '🇩🇪',
  france: '🇫🇷',
  spain: '🇪🇸',
  italy: '🇮🇹',
  netherlands: '🇳🇱',
  belgium: '🇧🇪',
  switzerland: '🇨🇭',
  austria: '🇦🇹',
  portugal: '🇵🇹',
  sweden: '🇸🇪',
  norway: '🇳🇴',
  denmark: '🇩🇰',
  finland: '🇫🇮',
};

// Removed: DEFAULT_PROCESSING_TIMES - now using database-driven rules

@Injectable()
export class WhatsAppTranslationService {
  private readonly logger = new Logger(WhatsAppTranslationService.name);

  constructor(private readonly supabaseService: SupabaseService) {}
  /**
   * Get Hebrew translation for a country name
   */
  getCountryNameHebrew(country: string): string {
    const normalizedCountry = country?.toLowerCase().trim();
    return COUNTRY_NAMES_HEBREW[normalizedCountry] || country;
  }

  /**
   * Get flag emoji for a country
   */
  getCountryFlag(country: string): string {
    const normalizedCountry = country?.toLowerCase().trim();
    return COUNTRY_FLAGS[normalizedCountry] || '';
  }

  /**
   * Get Hebrew translation for visa type - dynamically constructed from intent + validity
   */
  getVisaTypeHebrew(
    docType: string,
    intent?: string,
    country?: string,
    entries?: string,
    validity?: string,
    daysToUse?: number,
  ): string {
    const normalizedDocType = docType?.toLowerCase().trim();
    const normalizedIntent = intent?.toLowerCase().trim();
    const normalizedEntries = entries?.toLowerCase().trim();

    // Get Hebrew validity period
    const validityHebrew = this.getValidityHebrewString(validity, daysToUse);

    // Handle special doc types
    if (normalizedDocType === 'eta') {
      // ETA - Electronic Travel Authorization
      return `אישור נסיעה ${validityHebrew}`;
    }

    if (normalizedDocType === 'voa') {
      // Visa on Arrival
      return `ויזה בהגעה ${validityHebrew}`;
    }

    if (normalizedDocType === 'dtv' ||
        normalizedDocType === 'stv' ||
        normalizedDocType === 'ltv' ||
        !VISA_TYPES_HEBREW[normalizedDocType]) {
      // Keep unknown doc types in English with validity
      const docTypeUpper = docType?.toUpperCase() || 'VISA';
      return `${docTypeUpper} ${validityHebrew}`;
    }

    // Handle general intent specially for WhatsApp messages
    let intentHebrew: string;
    if (normalizedIntent === 'general') {
      // General means Tourism + Business, show both for clarity in messages
      intentHebrew = 'תיירות ועסקים';
    } else {
      // Get Hebrew intent (default to tourism if not provided)
      intentHebrew = VISA_TYPES_HEBREW[normalizedIntent || 'tourism'] || 'תיירות';
    }

    // Build dynamic visa type string
    // Format: "[Intent] [Validity]" or "[Intent], [Entries], [Validity]" for countries that need entries
    if (normalizedEntries === 'multiple') {
      // For multiple entries, include it in the description
      const entriesHebrew = 'רב פעמית';
      return `${intentHebrew}, ${entriesHebrew}, ${validityHebrew}`;
    } else {
      // For single entry or when not specified, just use intent + validity
      return `${intentHebrew} ${validityHebrew}`;
    }
  }

  /**
   * Get Hebrew string for validity period
   */
  private getValidityHebrewString(
    validity?: string,
    daysToUse?: number,
  ): string {
    // Handle specific days
    if (daysToUse) {
      if (daysToUse === 30) return 'לחודש';
      if (daysToUse === 60) return 'לחודשיים';
      if (daysToUse === 90) return '90 ימים';
      if (daysToUse === 180) return 'לחצי שנה';
      if (daysToUse === 365) return 'לשנה';
      if (daysToUse === 730) return 'לשנתיים';
      return `${daysToUse} ימים`;
    }

    // Handle validity strings
    const normalizedValidity = validity?.toLowerCase().trim();
    switch (normalizedValidity) {
      case 'month':
      case '1month':
        return 'לחודש';
      case 'year':
      case '1year':
        return 'לשנה';
      case '3months':
        return 'ל-3 חודשים';
      case '6months':
        return 'לחצי שנה';
      case '2years':
        return 'לשנתיים';
      case '5years':
        return 'ל-5 שנים';
      case '10years':
        return 'ל-10 שנים';
      default:
        return '30 ימים'; // Default
    }
  }

  /**
   * Extract validity period from text
   */
  private extractValidity(text: string): string {
    const normalizedText = text?.toLowerCase().trim();

    // Check for common validity patterns
    if (
      normalizedText?.includes('3month') ||
      normalizedText?.includes('3 month')
    ) {
      return '3months';
    }
    if (
      normalizedText?.includes('6month') ||
      normalizedText?.includes('6 month')
    ) {
      return '6months';
    }
    if (
      normalizedText?.includes('2year') ||
      normalizedText?.includes('2 year')
    ) {
      return '2years';
    }
    if (
      normalizedText?.includes('3year') ||
      normalizedText?.includes('3 year')
    ) {
      return '3years';
    }
    if (
      normalizedText?.includes('5year') ||
      normalizedText?.includes('5 year')
    ) {
      return '5years';
    }
    if (
      normalizedText?.includes('10year') ||
      normalizedText?.includes('10 year')
    ) {
      return '10years';
    }
    if (normalizedText?.includes('year')) {
      return 'year';
    }
    if (normalizedText?.includes('month')) {
      return 'month';
    }

    return '';
  }

  /**
   * Calculate processing days based on country and urgency
   * Uses database function for business rules calculation
   * Returns a string number of days
   */
  async calculateProcessingDays(
    country: string,
    urgency?: string,
    productDaysToUse?: number,
  ): Promise<string> {
    // If productDaysToUse is provided and valid, use it directly
    if (productDaysToUse && productDaysToUse > 0 && productDaysToUse <= 30) {
      return String(productDaysToUse);
    }

    try {
      interface RpcResponse {
        data: number | null;
        error: unknown;
      }

      // Call the database function for calculation
      const { data, error } = (await this.supabaseService.serviceClient.rpc(
        'calculate_processing_days',
        {
          p_country: country?.toLowerCase().trim() || '',
          p_urgency: urgency?.toLowerCase().trim() || undefined,
        },
      )) as RpcResponse;

      if (error) {
        this.logger.error('Error calculating processing days:', error);
        // Fallback to hardcoded logic
        return this.calculateProcessingDaysFallback(country, urgency);
      }

      return String(data ?? 3);
    } catch (error) {
      this.logger.error('Failed to calculate processing days:', error);
      // Fallback to hardcoded logic
      return this.calculateProcessingDaysFallback(country, urgency);
    }
  }

  /**
   * Fallback calculation when database function is unavailable
   */
  private calculateProcessingDaysFallback(
    country: string,
    urgency?: string,
  ): string {
    const isUrgent = urgency === 'urgent' || urgency === 'express';

    // If urgent, always 1 business day
    if (isUrgent) {
      return '1';
    }

    // Country-specific processing times
    const countryNormalized = country?.toLowerCase().trim();
    switch (countryNormalized) {
      case 'morocco':
        return '5';
      case 'vietnam':
        return '7';
      default:
        return '3'; // Default for all other countries
    }
  }
}
