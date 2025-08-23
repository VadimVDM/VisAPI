import { Injectable } from '@nestjs/common';

interface TranslationResult {
  countryHebrew: string;
  countryFlag: string;
  visaTypeHebrew: string;
  processingDays: string;
  urgencyHebrew: string;
}

@Injectable()
export class TranslationService {
  private readonly countryTranslations: Record<string, { hebrew: string; flag: string }> = {
    'uk': { hebrew: 'בריטניה', flag: '🇬🇧' },
    'gb': { hebrew: 'בריטניה', flag: '🇬🇧' },
    'usa': { hebrew: 'ארצות הברית', flag: '🇺🇸' },
    'us': { hebrew: 'ארצות הברית', flag: '🇺🇸' },
    'canada': { hebrew: 'קנדה', flag: '🇨🇦' },
    'ca': { hebrew: 'קנדה', flag: '🇨🇦' },
    'india': { hebrew: 'הודו', flag: '🇮🇳' },
    'in': { hebrew: 'הודו', flag: '🇮🇳' },
    'israel': { hebrew: 'ישראל', flag: '🇮🇱' },
    'il': { hebrew: 'ישראל', flag: '🇮🇱' },
    'vietnam': { hebrew: 'וייטנאם', flag: '🇻🇳' },
    'vn': { hebrew: 'וייטנאם', flag: '🇻🇳' },
    'korea': { hebrew: 'קוריאה הדרומית', flag: '🇰🇷' },
    'kr': { hebrew: 'קוריאה הדרומית', flag: '🇰🇷' },
    'morocco': { hebrew: 'מרוקו', flag: '🇲🇦' },
    'ma': { hebrew: 'מרוקו', flag: '🇲🇦' },
    'saudi_arabia': { hebrew: 'ערב הסעודית', flag: '🇸🇦' },
    'sa': { hebrew: 'ערב הסעודית', flag: '🇸🇦' },
    'schengen': { hebrew: 'שנגן', flag: '🇪🇺' },
    'eu': { hebrew: 'האיחוד האירופי', flag: '🇪🇺' },
    'thailand': { hebrew: 'תאילנד', flag: '🇹🇭' },
    'th': { hebrew: 'תאילנד', flag: '🇹🇭' },
    'sri_lanka': { hebrew: 'סרי לנקה', flag: '🇱🇰' },
    'lk': { hebrew: 'סרי לנקה', flag: '🇱🇰' },
    'nepal': { hebrew: 'נפאל', flag: '🇳🇵' },
    'np': { hebrew: 'נפאל', flag: '🇳🇵' },
    'kenya': { hebrew: 'קניה', flag: '🇰🇪' },
    'ke': { hebrew: 'קניה', flag: '🇰🇪' },
    'ethiopia': { hebrew: 'אתיופיה', flag: '🇪🇹' },
    'et': { hebrew: 'אתיופיה', flag: '🇪🇹' },
    'uganda': { hebrew: 'אוגנדה', flag: '🇺🇬' },
    'ug': { hebrew: 'אוגנדה', flag: '🇺🇬' },
    'tanzania': { hebrew: 'טנזניה', flag: '🇹🇿' },
    'tz': { hebrew: 'טנזניה', flag: '🇹🇿' },
    'kenya_tanzania_uganda': { hebrew: 'קניה/טנזניה/אוגנדה', flag: '🌍' },
    'australia': { hebrew: 'אוסטרליה', flag: '🇦🇺' },
    'au': { hebrew: 'אוסטרליה', flag: '🇦🇺' },
    'new_zealand': { hebrew: 'ניו זילנד', flag: '🇳🇿' },
    'nz': { hebrew: 'ניו זילנד', flag: '🇳🇿' },
    'philippines': { hebrew: 'הפיליפינים', flag: '🇵🇭' },
    'ph': { hebrew: 'הפיליפינים', flag: '🇵🇭' },
    'china': { hebrew: 'סין', flag: '🇨🇳' },
    'cn': { hebrew: 'סין', flag: '🇨🇳' },
    'japan': { hebrew: 'יפן', flag: '🇯🇵' },
    'jp': { hebrew: 'יפן', flag: '🇯🇵' },
    'russia': { hebrew: 'רוסיה', flag: '🇷🇺' },
    'ru': { hebrew: 'רוסיה', flag: '🇷🇺' },
    'uae': { hebrew: 'איחוד האמירויות', flag: '🇦🇪' },
    'ae': { hebrew: 'איחוד האמירויות', flag: '🇦🇪' },
    'egypt': { hebrew: 'מצרים', flag: '🇪🇬' },
    'eg': { hebrew: 'מצרים', flag: '🇪🇬' },
    'azerbaijan': { hebrew: 'אזרבייג׳ן', flag: '🇦🇿' },
    'az': { hebrew: 'אזרבייג׳ן', flag: '🇦🇿' },
    'georgia': { hebrew: 'גאורגיה', flag: '🇬🇪' },
    'ge': { hebrew: 'גאורגיה', flag: '🇬🇪' },
    'ethiopia_electronic': { hebrew: 'אתיופיה אלקטרונית', flag: '🇪🇹' },
    'dubai_96_hours': { hebrew: 'דובאי 96 שעות', flag: '🇦🇪' },
  };

  private readonly visaTypeTranslations: Record<string, string> = {
    'tourist': 'תייר',
    'tourism': 'תייר',
    'business': 'עסקים',
    'work': 'עבודה',
    'student': 'סטודנט',
    'family': 'משפחה',
    'medical': 'רפואי',
    'transit': 'מעבר',
    'pilgrimage': 'צליינות',
    'conference': 'כנס',
    'visitor': 'מבקר',
    'evisa': 'ויזה אלקטרונית',
    'visa_on_arrival': 'ויזה בהגעה',
    'tourist_visa': 'ויזת תייר',
    'business_visa': 'ויזת עסקים',
    'work_visa': 'ויזת עבודה',
    'study_visa': 'ויזת לימודים',
    'family_visa': 'ויזת משפחה',
  };

  private readonly urgencyTranslations: Record<string, string> = {
    'standard': 'רגיל',
    'express': 'מהיר',
    'urgent': 'דחוף',
    'super_urgent': 'דחוף מאוד',
    'emergency': 'חירום',
  };

  private readonly processingTimeMap: Record<string, string> = {
    'standard': '3-5 ימי עסקים',
    'express': '1-2 ימי עסקים',
    'urgent': '24 שעות',
    'super_urgent': '12 שעות',
    'emergency': '4-6 שעות',
  };

  translateOrderData(data: {
    country?: string;
    docType?: string;
    intent?: string;
    urgency?: string;
  }): TranslationResult {
    const countryKey = (data.country || '').toLowerCase().replace(/\s+/g, '_');
    const countryLower = data.country?.toLowerCase() ?? '';
    const country = this.countryTranslations[countryKey] || 
                   this.countryTranslations[countryLower] || 
                   { hebrew: data.country || 'לא ידוע', flag: '🌍' };

    const visaTypeKey = (data.docType || data.intent || 'tourist').toLowerCase();
    const intentLower = data.intent?.toLowerCase() ?? '';
    const visaType = this.visaTypeTranslations[visaTypeKey] || 
                    this.visaTypeTranslations[intentLower] ||
                    data.docType || 
                    'ויזת תייר';

    const urgencyKey = (data.urgency || 'standard').toLowerCase();
    const urgency = this.urgencyTranslations[urgencyKey] || 'רגיל';
    const processingDays = this.processingTimeMap[urgencyKey] || '3-5 ימי עסקים';

    return {
      countryHebrew: country.hebrew,
      countryFlag: country.flag,
      visaTypeHebrew: visaType,
      processingDays,
      urgencyHebrew: urgency,
    };
  }

  getCountryDetails(country: string): { hebrew: string; flag: string } {
    const countryKey = (country || '').toLowerCase().replace(/\s+/g, '_');
    return this.countryTranslations[countryKey] || 
           this.countryTranslations[country?.toLowerCase()] || 
           { hebrew: country || 'לא ידוע', flag: '🌍' };
  }

  getVisaTypeHebrew(visaType: string | undefined, intent: string | undefined): string {
    const key = (visaType || intent || 'tourist').toLowerCase();
    return this.visaTypeTranslations[key] || 
           this.visaTypeTranslations[intent?.toLowerCase() || ''] ||
           visaType || 
           'ויזת תייר';
  }

  getUrgencyHebrew(urgency: string | undefined): string {
    const key = (urgency || 'standard').toLowerCase();
    return this.urgencyTranslations[key] || 'רגיל';
  }

  getProcessingTime(urgency: string | undefined): string {
    const key = (urgency || 'standard').toLowerCase();
    return this.processingTimeMap[key] || '3-5 ימי עסקים';
  }
}