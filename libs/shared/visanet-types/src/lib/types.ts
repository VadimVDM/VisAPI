import {
  CREATED_TIMESTAMP_KEY,
  LOCALE_CODES,
  PRODUCT_NAMES,
  VISA_COUNTRY_KEYS,
  APPLICANT_PHOTO_TYPES,
  FILE_TRANSFER_METHODS,
  RELIGIONS,
  MARITAL_STATUSES,
  OCCUPATION_STATUSES,
  EDUCATION,
  SEXES,
  JOB_SENIORITIES,
  MILITARY_ROLES,
  MILITARY_RANKS,
  CURRENCIES,
  ORDER_STATUSES,
  DOMAINS,
  NATIONALITY_ACQUIRED_BY,
  NATIONALITY_STATUSES,
  EMAIL_TEMPLATES,
  PAYMENT_PROCESSORS,
  PRODUCT_INSTRUCTIONS,
  VALIDITIES,
  UPDATED_TIMESTAMP_KEY,
  VALID_SINCE_OPTIONS,
  INTENTS,
  ENTRY_TYPES,
  VISA_DOC_TYPES,
  ERRORS,
  BRANCHES,
  PAYMENT_PROCESSORS_LOGOS,
  VISA_DOC_NAMES,
  URGENCY_SPEED,
  LANGUAGES,
} from './constants';

// Utility types
export type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

type Replace<T, K extends keyof T, V> = {
  [P in keyof T]: P extends K ? V : T[P];
};

export type Domain = (typeof DOMAINS)[number];
export type AppError = (typeof ERRORS)[number];
export type CountryKey = (typeof VISA_COUNTRY_KEYS)[number];
export type VisaDocType = (typeof VISA_DOC_TYPES)[number];
export type VisaDocName = (typeof VISA_DOC_NAMES)[number];
export type Arrayable<T> = T | T[];
export type BranchCode = (typeof BRANCHES)[number];
export type LocaleCode = (typeof LOCALE_CODES)[number];
export type Language = (typeof LANGUAGES)[number];
export type RecaptchaAction =
  | 'save_form'
  | 'payment_intent'
  | 'send_contact_msg'
  | 'create_paypal_order'
  | 'send_resume_url'
  | 'get_order_status'
  | 'upload_photo';

// For CountryIso, we'll use a subset of common country codes since countries.json isn't available
export type CountryIso =
  | 'us'
  | 'ca'
  | 'mx'
  | 'br'
  | 'ar'
  | 'gb'
  | 'fr'
  | 'de'
  | 'es'
  | 'it'
  | 'ru'
  | 'cn'
  | 'jp'
  | 'kr'
  | 'in'
  | 'au'
  | 'nz'
  | 'za'
  | 'eg'
  | 'ng'
  | 'il'
  | 'sa'
  | 'ae'
  | 'tr'
  | 'se'
  | 'no'
  | 'dk'
  | 'fi'
  | 'pl'
  | 'ua'
  | 'kz'
  | 'by'
  | 'uz'
  | 'th'
  | 'vn'
  | 'my'
  | 'sg'
  | 'id'
  | 'ph'
  | 'pk';

export type NationalityAcquiredBy = (typeof NATIONALITY_ACQUIRED_BY)[number];
export type NationalityStatus = (typeof NATIONALITY_STATUSES)[number];
export type DateISO = string;
export type SocialMedia =
  | 'facebook'
  | 'instagram'
  | 'google'
  | 'x'
  | 'vk'
  | 'yandex';
export type ReviewSite =
  | 'yandex'
  | 'google'
  | 'otzovik'
  | 'irecommend'
  | '2gis'
  | 'trustpilot'
  | 'facebook'
  | 'easy';

export type Phone = { code: string; number: string };

// MongoDB compatibility types
export type ObjectId = string;

export type DB<T> = T & {
  _id: ObjectId;
  [CREATED_TIMESTAMP_KEY]: string;
  [UPDATED_TIMESTAMP_KEY]: string;
};
export type SerializedDb<T> = Replace<DB<T>, '_id', string>;

export type TrustingCompanies =
  | 'aeroflot'
  | 'tinkoff'
  | 'gazprom'
  | 'yandex'
  | 'mts'
  | 'sberbank'
  | 'sas'
  | 'investor_ab'
  | 'spotify'
  | 'ericsson'
  | 'swedbank'
  | 'atlas_copco'
  | 'british_airways'
  | 'astra_zeneca'
  | 'vodafone'
  | 'arm'
  | 'revolut'
  | 'barclays'
  | 'elal'
  | 'meta'
  | 'nvidia'
  | 'lametayel'
  | 'iai'
  | 'parallel_wireless'
  | 'intel'
  | 'pfizer'
  | 'american_airlines'
  | 'airbnb'
  | 'tmobile'
  | 'coral_travel'
  | 's7_airlines'
  | 'ving_se'
  | 'klarna'
  | 'swedavia'
  | 'ikea';

export type ResumeStatus =
  | 'pending'
  | 'non_resumable'
  | 'resumable'
  | 'resuming'
  | 'success'
  | 'error';
export type MobilePaymentProcessor = 'bit' | 'paybox';
export type ReviewLinks = { [key in ReviewSite]?: string };

// Core interfaces
export interface Branch {
  code: BranchCode;
  id: Uppercase<BranchCode>;
  domain: Domain;
  locale: LocaleCode;
  language: Language;
  currency: Currency;
  baseCountry: CountryIso;
  acknowledgedBranches: Readonly<BranchCode[]>;
  visaCountries: Readonly<CountryKey[]>;
  insurance?: { countries: Readonly<CountryKey[]>; url: string };
  business: {
    idTypeKey: 'tax_id' | 'company_num';
    number: string;
    owner?: string;
  };
  companyAddress: Address & { text: string };
  phone: { raw: string; display: string };
  whatsappBot?: string;
  trustingCompanies: TrustingCompanies[];
  crispId: string;
  telegram?: string;
  emailUsername: string;
  blog?: string;
  announcement?: string;
  socialLinks: { [key in SocialMedia]?: string };
  reviews: { links: ReviewLinks; public: boolean };
  passportExample: string;
  officePicture: string;
  paymentProcessors: PaymentProcessor[];
  paymentLogos: PaymentLogo[];
  mobilePayments?: {
    processors: MobilePaymentProcessor[];
    phone: string;
  };
  visaCountryNationalities?: Partial<Record<CountryKey, CountryIso[]>>;
  productReplacement?: Partial<Record<ProductName, ProductName>>;
  nonCompany?: boolean;
  gtag?: string;
  yandexMetrica?: number;
  fbBanMsg?: string;
}

export interface Client {
  name: string;
  email: string;
  phone: Phone;
  whatsappAlertsEnabled: boolean;
}

// Product types
export type ProductName = (typeof PRODUCT_NAMES)[number];
type Instruction = (typeof PRODUCT_INSTRUCTIONS)[number];

export interface Urgency {
  speed: (typeof URGENCY_SPEED)[number];
  fee: Price;
  isAppointment?: boolean;
}

type ProductVariationValidityByNationality = {
  type: 'validity';
  validity: (typeof VALIDITIES)[number];
  dependency: 'nationality';
  nationalities: CountryIso[];
  name: 'validity_6_months_by_nationality' | 'validity_2_years_by_nationality';
};

type ProductVariationFeeBase = {
  type: 'fee';
  fee: Price;
};

type ProductVariationFeeByNationality = ProductVariationFeeBase & {
  dependency: 'nationality';
  nationalities: CountryIso[];
  name: 'fee_by_nationality';
};

type ProductVariationFeeByMinAge = ProductVariationFeeBase & {
  dependency: 'min_age';
  age: number;
  name: 'fee_60_plus';
};

type ProductVariationStayLimitByNationality = {
  type: 'stay_limit';
  limit: number;
  dependency: 'nationality';
  nationalities: CountryIso[];
  name: 'stay_limit_by_nationality';
};

export type ProductVariation =
  | ProductVariationValidityByNationality
  | ProductVariationFeeByNationality
  | ProductVariationFeeByMinAge
  | ProductVariationStayLimitByNationality;

export type ApplicableVariation = ProductVariation & {
  applicantId: Applicant['id'];
};

export interface Product {
  name: ProductName;
  country: CountryKey;
  docType: VisaDocType;
  docName: VisaDocName;
  intent: (typeof INTENTS)[number];
  entries: (typeof ENTRY_TYPES)[number];
  validity: (typeof VALIDITIES)[number];
  valid_since: (typeof VALID_SINCE_OPTIONS)[number];
  wait: 1 | 2 | 3 | 4 | 5 | 7 | 10 | 21 | 30;
  price: Price;
  instructions: Instruction[];
  urgencies?: Urgency[];
  stay_limit?: number;
  calendar_stay_limit?: number;
  six_months_stay_limit?: number;
  days_to_use?: number;
  photo_types?: ApplicantPhotoType[];
  consulate_payment_countries?: CountryIso[];
  fee_partial?: boolean;
  note?: string; // Simplified from I18nKey
  variations?: ProductVariation[];
  variation_name?: ProductVariation['name'];
  replacement?: { active: boolean };
}

export type Currency = (typeof CURRENCIES)[number];
export type Price = Record<Currency, number>;

// Form types
export type FormStep =
  | 'details'
  | 'payment'
  | 'review'
  | 'upload'
  | 'visa_select';

export interface BaseVisaForm {
  id: string;
  country: CountryKey;
  client: Client;
  product: Readonly<Product>;
  quantity: number;
  urgency: Urgency['speed'] | 'none';
  discount?: Discount;
  termsAgreed: boolean;
  orderId: Order['id'] | null;
  meta: {
    url: string;
    branch: BranchCode;
    domain: Domain;
    referrer: string;
    step: number;
    completion: number;
    resumed: boolean;
    timestamp: number;
    clientIp: string;
    revision: number;
  };
}

export type FileTransferMethod = (typeof FILE_TRANSFER_METHODS)[number];

// Address and related types
export interface Address {
  line: string;
  city: string;
  country: CountryIso;
  setBy?: number;
  postalCode?: string;
}

export interface Family {
  father: FamilyMember;
  mother: FamilyMember;
  marital: Marital;
}

export interface Marital {
  status: MaritalStatus;
  spouse: FamilyMember;
}

export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export interface FamilyMember {
  name: string;
  countryOfBirth: CountryIso;
}

export type Religion = (typeof RELIGIONS)[number];
export type Education = (typeof EDUCATION)[number];
export type Sex = (typeof SEXES)[number];

export interface Occupation {
  education: Education;
  status: OccupationStatus;
  name: string;
  seniority: JobSeniority;
  phone: Phone;
  address: Address;
}

export type JobSeniority = (typeof JOB_SENIORITIES)[number];
export type OccupationStatus = (typeof OCCUPATION_STATUSES)[number];

export interface Military {
  served: boolean;
  role: MilitaryRole;
  rank: MilitaryRank;
}

export type MilitaryRole = (typeof MILITARY_ROLES)[number];
export type MilitaryRank = (typeof MILITARY_RANKS)[number];

export interface PastTravels {
  pastVisit: PastVisit;
  rejection: string;
  SAARC: SaarcVisit;
}

export interface PastVisit {
  visited: boolean;
  pastVisa: {
    number: string;
    dateOfIssue: DateISO;
  };
}

export interface SaarcVisit {
  visited: boolean;
  countries: CountryIso[];
  year: number;
}

export type ApplicantPhotoType = (typeof APPLICANT_PHOTO_TYPES)[number];
export type ApplicantFiles = Partial<Record<ApplicantPhotoType, string>>;

// Order types
export interface Order {
  id: string;
  form_id: VisaForm['id'];
  branch: BranchCode;
  domain: Domain;
  payment_processor: PaymentProcessor;
  payment_id: string;
  amount: number;
  currency: string;
  coupon: Coupon | null;
  status: (typeof ORDER_STATUSES)[number];
}

export type PaymentProcessor = (typeof PAYMENT_PROCESSORS)[number];
export type PaymentLogo = (typeof PAYMENT_PROCESSORS_LOGOS)[number];

// Coupon and discount
export interface Coupon {
  code: string;
  discount: number;
  activation_count: number;
  order_count: number;
  expiry?: DateISO;
  onetime?: boolean;
  partner?: {
    name: string;
    email: string;
  };
}

export interface Discount {
  coupon: Coupon['code'];
  percent: number;
}

// Entry and travel types
type CrossingLand = { type: 'land'; border: string };
type CrossingSea = { type: 'sea'; ship: string };
type CrossingAir = { type: 'air'; flight: string };
export type Crossing = CrossingLand | CrossingSea | CrossingAir;

export interface Entry {
  date: DateISO;
  port: string | null;
  crossing?: Crossing;
}

export interface LastTravel {
  traveled: boolean;
  country: CountryIso;
  from: DateISO;
  until: DateISO;
}

export interface AccompanyingChild {
  name: string;
  dateOfBirth: DateISO;
  countryOfBirth: CountryIso;
}

export interface EmergencyContact {
  name: string;
  phone: Phone;
  address?: Address;
  relation?: string;
}

// Extra nationality types (discriminated union)
type ExtraNationalityNone = { status: 'none' };
type HasOrHadNationality = {
  country: CountryIso;
  from?: DateISO;
  acquiry?: NationalityAcquiredBy;
};
type ExtraNationalityPast = HasOrHadNationality & {
  status: 'past';
  until: DateISO;
};
type ExtraNationalityPresent = HasOrHadNationality & {
  status: 'present';
};
export type ExtraNationality =
  | ExtraNationalityNone
  | ExtraNationalityPast
  | ExtraNationalityPresent;

// Passport types
export interface Passport {
  nationality: CountryIso;
  firstName: string;
  lastName: string;
  sex: Sex;
  dateOfBirth: DateISO;
  countryOfBirth: CountryIso;
  number: string;
  dateOfIssue: DateISO;
  dateOfExpiry: DateISO;
  placeOfIssue: CountryIso;
}

type PassportOmit<K extends keyof Passport> = Omit<Passport, K>;

// Base applicant type
export interface BaseApplicant {
  id: string;
}

// Country-specific applicant types
interface IndiaApplicant extends BaseApplicant {
  passport: Passport;
  extraNationality: ExtraNationality;
  idNumber: string;
  address: Address;
  religion: Religion;
  crime: string;
  family: Family;
  occupation: Occupation;
  military: Military;
  pastTravels: PastTravels;
  files: ApplicantFiles;
}

interface CanadaApplicant extends BaseApplicant {
  passport: Passport;
  address: Address;
  occupation: Occupation;
  marital: Marital;
  crime: string;
  pastTravels: PastTravels;
}

interface SriLankaApplicant extends BaseApplicant {
  passport: Passport;
}

interface MoroccoApplicant extends BaseApplicant {
  passport: PassportOmit<'placeOfIssue'>;
  occupation: OccupationStatus;
  files: ApplicantFiles;
}

interface NewZealandApplicant extends BaseApplicant {
  passport: PassportOmit<'placeOfIssue' | 'dateOfIssue'>;
  idNumber: string;
  cityOfBirth: string;
  files: ApplicantFiles;
}

interface VietnamApplicant extends BaseApplicant {
  passport: PassportOmit<'placeOfIssue'>;
  idNumber: string;
  address: Address;
  extraNationality: ExtraNationality;
  occupation: Occupation;
  religion: Religion;
  files: ApplicantFiles;
}

interface UsaApplicant extends BaseApplicant {
  passport: PassportOmit<'placeOfIssue'>;
  extraNationality: ExtraNationality;
  cityOfBirth: string;
  address: Address;
  family: Family;
  occupation: Occupation;
  pastRejection: string;
  crime: string;
  files: ApplicantFiles;
}

interface KoreaApplicant extends BaseApplicant {
  passport: PassportOmit<'placeOfIssue' | 'dateOfIssue'>;
  address: Address;
  extraNationality: ExtraNationality;
  cityOfBirth: string;
  visited: boolean;
  lastTravel: LastTravel;
  occupation: Occupation;
  crime: string;
  files: ApplicantFiles;
}

interface CambodiaApplicant extends BaseApplicant {
  passport: PassportOmit<'placeOfIssue'>;
  files: ApplicantFiles;
}

interface IsraelApplicant extends BaseApplicant {
  passport: PassportOmit<'placeOfIssue'>;
  extraNationality: ExtraNationality;
  family: Family;
  address: Address;
  occupation: Occupation;
  pastVisit: { visited: boolean; year: string };
  files: ApplicantFiles;
}

interface SaudiArabiaApplicant extends BaseApplicant {
  passport: Passport;
  address: Address;
  maritalStatus: MaritalStatus;
  occupation: OccupationStatus;
  religion: Religion;
  guardianPassport: string;
  files: ApplicantFiles;
}

interface BahrainApplicant extends BaseApplicant {
  passport: PassportOmit<'placeOfIssue'>;
  occupation: Occupation;
  files: ApplicantFiles;
}

interface IndonesiaApplicant extends BaseApplicant {
  passport: Passport;
  files: ApplicantFiles;
}

interface UkApplicant extends BaseApplicant {
  passport: Pick<Passport, 'firstName' | 'lastName'>;
  address: Address;
  occupation: Occupation;
  crime: string;
  extraNationality: ExtraNationality;
  files: ApplicantFiles;
}

interface TogoApplicant extends BaseApplicant {
  passport: Passport;
  address: Address;
  family: Family;
  occupation: OccupationStatus;
  files: ApplicantFiles;
}

interface ThailandApplicant extends BaseApplicant {
  passport: Passport;
  extraNationality: ExtraNationality;
  cityOfBirth: string;
  maritalStatus: MaritalStatus;
  address: Address;
  occupation: Occupation;
  visited: boolean;
  files: ApplicantFiles;
}

interface SchengenApplicant extends BaseApplicant {
  passport: PassportOmit<'placeOfIssue'>;
  address: Address;
  cityOfBirth: string;
  maritalStatus: MaritalStatus;
  occupation: Occupation;
}

// Country-specific form types
export interface IndiaVisaForm extends BaseVisaForm {
  entry: Entry;
  business: {
    name: string;
    sector: string;
    phone: Phone;
    address: Address;
    website?: string;
  };
  applicants: IndiaApplicant[];
  fileTransferMethod: FileTransferMethod;
}

export interface CanadaVisaForm extends BaseVisaForm {
  entry: Entry;
  applicants: CanadaApplicant[];
}

export interface SriLankaVisaForm extends BaseVisaForm {
  entry: Entry;
  address: Address;
  stayAddress: string;
  applicants: SriLankaApplicant[];
}

export interface MoroccoVisaForm extends BaseVisaForm {
  entry: Entry;
  applicants: MoroccoApplicant[];
  fileTransferMethod: FileTransferMethod;
}

export interface NewZealandVisaForm extends BaseVisaForm {
  entry: Entry;
  applicants: NewZealandApplicant[];
  fileTransferMethod: FileTransferMethod;
}

export interface VietnamVisaForm extends BaseVisaForm {
  entry: Entry;
  hotel: string;
  emergencyContact: EmergencyContact;
  applicants: VietnamApplicant[];
  fileTransferMethod: FileTransferMethod;
}

export interface UsaVisaForm extends BaseVisaForm {
  emergencyContact: EmergencyContact;
  applicants: UsaApplicant[];
  fileTransferMethod: FileTransferMethod;
}

export interface KoreaVisaForm extends BaseVisaForm {
  entry: Entry;
  stayAddress: string;
  children: AccompanyingChild[];
  applicants: KoreaApplicant[];
  fileTransferMethod: FileTransferMethod;
}

export interface CambodiaVisaForm extends BaseVisaForm {
  entry: Entry;
  stayAddress: string;
  applicants: CambodiaApplicant[];
  fileTransferMethod: FileTransferMethod;
}

export interface IsraelVisaForm extends BaseVisaForm {
  entry: Entry;
  applicants: IsraelApplicant[];
  fileTransferMethod: FileTransferMethod;
}

export interface SaudiArabiaVisaForm extends BaseVisaForm {
  entry: Entry;
  applicants: SaudiArabiaApplicant[];
  fileTransferMethod: FileTransferMethod;
}

export interface BahrainVisaForm extends BaseVisaForm {
  applicants: BahrainApplicant[];
  fileTransferMethod: FileTransferMethod;
}

export interface IndonesiaVisaForm extends BaseVisaForm {
  stayAddress: string;
  applicants: IndonesiaApplicant[];
  fileTransferMethod: FileTransferMethod;
}

export interface UkVisaForm extends BaseVisaForm {
  applicants: UkApplicant[];
  fileTransferMethod: FileTransferMethod;
}

export interface TogoVisaForm extends BaseVisaForm {
  entry: Entry;
  emergencyContact: EmergencyContact;
  stayAddress: string;
  applicants: TogoApplicant[];
  fileTransferMethod: FileTransferMethod;
}

export interface ThailandVisaForm extends BaseVisaForm {
  entry: Entry;
  stayAddress: string;
  applicants: ThailandApplicant[];
  fileTransferMethod: FileTransferMethod;
}

export interface SchengenVisaForm extends BaseVisaForm {
  entry: Entry;
  applicants: SchengenApplicant[];
}

// Country form mappings
interface _CountryFormMap {
  india: IndiaVisaForm;
  canada: CanadaVisaForm;
  sri_lanka: SriLankaVisaForm;
  morocco: MoroccoVisaForm;
  new_zealand: NewZealandVisaForm;
  vietnam: VietnamVisaForm;
  usa: UsaVisaForm;
  korea: KoreaVisaForm;
  cambodia: CambodiaVisaForm;
  israel: IsraelVisaForm;
  saudi_arabia: SaudiArabiaVisaForm;
  bahrain: BahrainVisaForm;
  indonesia: IndonesiaVisaForm;
  uk: UkVisaForm;
  togo: TogoVisaForm;
  thailand: ThailandVisaForm;
  schengen: SchengenVisaForm;
}

export type CountryFormMap = { [K in CountryKey]: _CountryFormMap[K] };
export type VisaForm = CountryFormMap[keyof CountryFormMap];

export type VisaFormWithFiles = Extract<
  VisaForm,
  {
    fileTransferMethod: FileTransferMethod;
    applicants: ApplicantWithFiles[];
  }
>;

export type BusinessVisaForm = Extract<VisaForm, { business: any }>;
export type CountryApplicantMap = {
  [K in CountryKey]: CountryFormMap[K]['applicants'][number];
};
export type Applicant = VisaForm['applicants'][number];
export type ApplicantWithFiles = Extract<Applicant, { files: ApplicantFiles }>;
export type PayedVisaForm = VisaForm & { orderId: Order['id'] };

// Email and other types
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

// Additional types for API options
export interface GetFormsOptions {
  country?: CountryKey;
  email?: string;
  payed?: string;
  branch?: BranchCode;
  from?: DateISO;
  until?: DateISO;
  page?: number;
  count?: number;
}

export interface GetSentEmailsOptions {
  email?: string;
  template?: EmailTemplate;
  from?: DateISO;
  until?: DateISO;
}
