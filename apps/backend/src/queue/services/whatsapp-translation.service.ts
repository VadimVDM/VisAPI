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
  'new_zealand': 'ניו זילנד',  // Also handle underscore version
  cambodia: 'קמבודיה',
  schengen: 'אזור שנגן',
  'schengen area': 'אזור שנגן',
  morocco: 'מרוקו',
  'sri lanka': 'סרי לנקה',
  'sri_lanka': 'סרי לנקה',  // Also handle underscore version
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
  'new_zealand': '🇳🇿',  // Also handle underscore version
  cambodia: '🇰🇿',
  schengen: '🇪🇺',
  'schengen area': '🇪🇺',
  morocco: '🇲🇦',
  'sri lanka': '🇱🇰',
  'sri_lanka': '🇱🇰',  // Also handle underscore version
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
    // Format: "[Intent] [Validity]" or "[Intent], [Entries], [Validity]" for multiple entries
    // Note: "double" entries are treated same as "single" - no entries mention
    if (normalizedEntries === 'multiple') {
      // For multiple entries, include it in the description
      const entriesHebrew = 'רב פעמית';
      return `${intentHebrew}, ${entriesHebrew}, ${validityHebrew}`;
    } else {
      // For single, double, or when not specified, just use intent + validity
      // (double entries treated same as single - no entries text)
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

    // Handle validity strings (normalize underscores to no-underscores)
    const normalizedValidity = validity?.toLowerCase().trim().replace('_', '');
    switch (normalizedValidity) {
      case 'month':
      case '1month':
        return 'לחודש';
      case 'year':
      case '1year':
        return 'לשנה';
      case '2months':
        return 'לחודשיים';
      case '3months':
        return 'ל-3 חודשים';
      case '6months':
        return 'לחצי שנה';
      case '2years':
        return 'לשנתיים';
      case '3years':
        return 'ל-3 שנים';
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
   * Get processing days directly from the order data (no complex rules)
   * Returns the processing time as provided by Vizi API
   */
  getProcessingDays(processingDays?: number): string {
    // Use the processing days directly from the order (from Vizi API)
    if (processingDays && processingDays > 0) {
      return String(processingDays);
    }

    // Fallback to 3 days if not provided
    return '3';
  }
}
