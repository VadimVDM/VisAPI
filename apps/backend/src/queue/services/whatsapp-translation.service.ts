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
  student: 'סטודנט',
  evisa: 'ויזה אלקטרונית',
  'e-visa': 'ויזה אלקטרונית',
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

const VALIDITY_HEBREW: Record<string, string> = {
  month: 'חודש',
  '1month': 'חודש',
  year: 'שנה',
  '1year': 'שנה',
  '3months': '3 חודשים',
  '6months': '6 חודשים',
  '2years': 'שנתיים',
  '3years': '3 שנים',
  '5years': '5 שנים',
  '10years': '10 שנים',
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
   * Get Hebrew translation for visa type
   */
  getVisaTypeHebrew(docType: string, intent?: string): string {
    const normalizedDocType = docType?.toLowerCase().trim();
    const normalizedIntent = intent?.toLowerCase().trim();

    // First check if we have a specific intent translation
    if (normalizedIntent && VISA_TYPES_HEBREW[normalizedIntent]) {
      const intentHebrew = VISA_TYPES_HEBREW[normalizedIntent];

      // Check validity if it's part of the doc type
      if (
        normalizedDocType?.includes('month') ||
        normalizedDocType?.includes('year')
      ) {
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
      // Call the database function for calculation
      const { data, error } = (await this.supabaseService.serviceClient.rpc(
        'calculate_processing_days' as any,
        {
          p_country: country?.toLowerCase().trim() || null,
          p_urgency: urgency?.toLowerCase().trim() || null,
        },
      )) as { data: number | null; error: any };

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
