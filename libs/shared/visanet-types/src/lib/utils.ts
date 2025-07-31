import {
  ExtraNationality,
  VisaForm,
  CountryKey,
  IndiaVisaForm,
  CanadaVisaForm,
  SriLankaVisaForm,
  MoroccoVisaForm,
  NewZealandVisaForm,
  VietnamVisaForm,
  UsaVisaForm,
  KoreaVisaForm,
  CambodiaVisaForm,
  IsraelVisaForm,
  SaudiArabiaVisaForm,
  BahrainVisaForm,
  IndonesiaVisaForm,
  UkVisaForm,
  TogoVisaForm,
  ThailandVisaForm,
  SchengenVisaForm,
} from './types';

// Type guards for ExtraNationality discriminated union
export function isExtraNationalityNone(
  value: ExtraNationality,
): value is { status: 'none' } {
  return value.status === 'none';
}

export function isExtraNationalityPast(
  value: ExtraNationality,
): value is ExtraNationality & { status: 'past' } {
  return value.status === 'past';
}

export function isExtraNationalityPresent(
  value: ExtraNationality,
): value is ExtraNationality & { status: 'present' } {
  return value.status === 'present';
}

// Type guards for country-specific forms
export function isIndiaVisaForm(form: VisaForm): form is IndiaVisaForm {
  return form.country === 'india';
}

export function isCanadaVisaForm(form: VisaForm): form is CanadaVisaForm {
  return form.country === 'canada';
}

export function isSriLankaVisaForm(form: VisaForm): form is SriLankaVisaForm {
  return form.country === 'sri_lanka';
}

export function isMoroccoVisaForm(form: VisaForm): form is MoroccoVisaForm {
  return form.country === 'morocco';
}

export function isNewZealandVisaForm(
  form: VisaForm,
): form is NewZealandVisaForm {
  return form.country === 'new_zealand';
}

export function isVietnamVisaForm(form: VisaForm): form is VietnamVisaForm {
  return form.country === 'vietnam';
}

export function isUsaVisaForm(form: VisaForm): form is UsaVisaForm {
  return form.country === 'usa';
}

export function isKoreaVisaForm(form: VisaForm): form is KoreaVisaForm {
  return form.country === 'korea';
}

export function isCambodiaVisaForm(form: VisaForm): form is CambodiaVisaForm {
  return form.country === 'cambodia';
}

export function isIsraelVisaForm(form: VisaForm): form is IsraelVisaForm {
  return form.country === 'israel';
}

export function isSaudiArabiaVisaForm(
  form: VisaForm,
): form is SaudiArabiaVisaForm {
  return form.country === 'saudi_arabia';
}

export function isBahrainVisaForm(form: VisaForm): form is BahrainVisaForm {
  return form.country === 'bahrain';
}

export function isIndonesiaVisaForm(form: VisaForm): form is IndonesiaVisaForm {
  return form.country === 'indonesia';
}

export function isUkVisaForm(form: VisaForm): form is UkVisaForm {
  return form.country === 'uk';
}

export function isTogoVisaForm(form: VisaForm): form is TogoVisaForm {
  return form.country === 'togo';
}

export function isThailandVisaForm(form: VisaForm): form is ThailandVisaForm {
  return form.country === 'thailand';
}

export function isSchengenVisaForm(form: VisaForm): form is SchengenVisaForm {
  return form.country === 'schengen';
}

// Helper function to get form type by country
export function getFormTypeByCountry(country: CountryKey): string {
  const typeMap: Record<CountryKey, string> = {
    india: 'IndiaVisaForm',
    canada: 'CanadaVisaForm',
    sri_lanka: 'SriLankaVisaForm',
    morocco: 'MoroccoVisaForm',
    new_zealand: 'NewZealandVisaForm',
    vietnam: 'VietnamVisaForm',
    usa: 'UsaVisaForm',
    korea: 'KoreaVisaForm',
    cambodia: 'CambodiaVisaForm',
    israel: 'IsraelVisaForm',
    saudi_arabia: 'SaudiArabiaVisaForm',
    bahrain: 'BahrainVisaForm',
    indonesia: 'IndonesiaVisaForm',
    uk: 'UkVisaForm',
    togo: 'TogoVisaForm',
    thailand: 'ThailandVisaForm',
    schengen: 'SchengenVisaForm',
  };

  return typeMap[country] || 'UnknownVisaForm';
}

// Validation helpers
export function isValidCountryKey(value: string): value is CountryKey {
  const validCountries: CountryKey[] = [
    'india',
    'canada',
    'sri_lanka',
    'morocco',
    'new_zealand',
    'vietnam',
    'usa',
    'korea',
    'cambodia',
    'israel',
    'saudi_arabia',
    'bahrain',
    'indonesia',
    'uk',
    'togo',
    'thailand',
    'schengen',
  ];

  return validCountries.includes(value as CountryKey);
}

// Helper to check if a form has file transfer method
export function hasFileTransferMethod(form: VisaForm): boolean {
  return 'fileTransferMethod' in form;
}

// Helper to check if a form has business details
export function hasBusinessDetails(form: VisaForm): boolean {
  return 'business' in form;
}

// Helper to check if a form has entry details
export function hasEntryDetails(form: VisaForm): boolean {
  return 'entry' in form;
}

// Helper to check if a form has emergency contact
export function hasEmergencyContact(form: VisaForm): boolean {
  return 'emergencyContact' in form;
}

// Date helpers
export function isValidISODate(date: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(date)) {
    return false;
  }

  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
}

// Phone number validation helper
export function isValidPhoneNumber(phone: {
  code: string;
  number: string;
}): boolean {
  // Basic validation - can be expanded based on requirements
  const codeRegex = /^\+?\d{1,4}$/;
  const numberRegex = /^\d{6,15}$/;

  return codeRegex.test(phone.code) && numberRegex.test(phone.number);
}

// Email validation helper
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Passport number validation helper
export function isValidPassportNumber(passportNumber: string): boolean {
  // Basic validation - passport numbers are typically 6-12 alphanumeric characters
  const passportRegex = /^[A-Z0-9]{6,12}$/i;
  return passportRegex.test(passportNumber);
}
