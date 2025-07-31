import { CREATED_TIMESTAMP_KEY, LOCALE_CODES, PRODUCT_NAMES, VISA_COUNTRY_KEYS, APPLICANT_PHOTO_TYPES, FILE_TRANSFER_METHODS, RELIGIONS, MARITAL_STATUSES, OCCUPATION_STATUSES, EDUCATION, SEXES, JOB_SENIORITIES, MILITARY_ROLES, MILITARY_RANKS, CURRENCIES, ORDER_STATUSES, DOMAINS, NATIONALITY_ACQUIRED_BY, NATIONALITY_STATUSES, EMAIL_TEMPLATES, PAYMENT_PROCESSORS, PRODUCT_INSTRUCTIONS, VALIDITIES, UPDATED_TIMESTAMP_KEY, VALID_SINCE_OPTIONS, INTENTS, ENTRY_TYPES, VISA_DOC_TYPES, ERRORS, BRANCHES, PAYMENT_PROCESSORS_LOGOS, VISA_DOC_NAMES, URGENCY_SPEED, LANGUAGES } from "./assets/constants";
import type COUNTRIES_ENG from './assets/countries.json';
import type { ObjectId } from "mongodb";
import type ContactEmail from "./emails/ContactEmail.vue";
import type NewOrderEmail from "./emails/NewOrderEmail.vue";
import type ResumeUrlEmail from "./emails/ResumeUrlEmail.vue";
import type FormAbandonmentEmail from "./emails/FormAbandonmentEmail.vue";
import type OrderRecievedEmail from "./emails/OrderReceivedEmail.vue";
import type ApprovedEmail from "./emails/ApprovedEmail.vue";
import type CouponUsedEmail from "./emails/CouponUsedEmail.vue";
import type OrderStatusEmail from "./emails/OrderStatusEmail.vue";
import type RequestForBillEmail from "./emails/BillRequestEmail.vue";
import type BillRequestReceivedEmail from "./emails/BillRequestReceivedEmail.vue";
import type OnetimeCouponEmail from "./emails/OnetimeCouponEmail.vue";
import type MobilePaymentEmail from "./emails/MobilePaymentEmail.vue";
import type FixEmail from "./emails/FixEmail.vue";
import type { I18nKey } from "./helpers/locale";

declare global {
  interface Window {
    paypal: any;
    $crisp: any;
    CRISP_WEBSITE_ID: string;
    grecaptcha: any;
    dataLayer: any;
    ym?: Function;
  }
}

export type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

type Replace<T, K extends keyof T, V> = { [P in keyof T]: P extends K ? V : T[P] };

export type Domain = typeof DOMAINS[number];

export type AppError = typeof ERRORS[number];

export type CountryKey = typeof VISA_COUNTRY_KEYS[number];

export type VisaDocType = typeof VISA_DOC_TYPES[number];
export type VisaDocName = typeof VISA_DOC_NAMES[number];

export type Arrayable<T> = T | T[];

export type BranchCode = typeof BRANCHES[number];
export type LocaleCode = typeof LOCALE_CODES[number];
export type Language = typeof LANGUAGES[number];

export type RecaptchaAction =
  'save_form' | 'payment_intent' | 'send_contact_msg' | 'create_paypal_order' | 'send_resume_url' | 'get_order_status' | 'upload_photo';

export type CountryIso = keyof typeof COUNTRIES_ENG;

export type NationalityAcquiredBy = typeof NATIONALITY_ACQUIRED_BY[number];
export type NationalityStatus = typeof NATIONALITY_STATUSES[number];

export type DateISO = string;

export type SocialMedia = 'facebook' | 'instagram' | 'google' | 'x' | 'vk' | 'yandex';
export type ReviewSite = 'yandex' | 'google' | 'otzovik' | 'irecommend' | '2gis' | 'trustpilot' | 'facebook' | 'easy';

export type Phone = { code: string; number: string; };

export type DB<T> = T & {
  _id: ObjectId;
  [CREATED_TIMESTAMP_KEY]: string;
  [UPDATED_TIMESTAMP_KEY]: string;
};
export type SerializedDb<T> = Replace<DB<T>, '_id', string>;

export type TrustingCompanies =
  'aeroflot' | 'tinkoff' | 'gazprom' | 'yandex' | 'mts' | 'sberbank'|
  'sas' | 'investor_ab' | 'spotify' | 'ericsson' | 'swedbank' | 'atlas_copco' |
  'british_airways' | 'astra_zeneca' | 'vodafone' | 'arm' | 'revolut' | 'barclays' |
  'elal' | 'meta' | 'nvidia' | 'lametayel' | 'iai' | 'parallel_wireless' |
  'intel' | 'pfizer' | 'american_airlines' | 'airbnb' | 'tmobile' | 'coral_travel' | 's7_airlines' |
  'ving_se' | 'klarna' | 'swedavia' | 'ikea' ;

export type ResumeStatus = 'pending' | 'non_resumable' | 'resumable' | 'resuming' | 'success' | 'error';

export type MobilePaymentProcessor = 'bit' | 'paybox';
export type ReviewLinks = { [key in ReviewSite]?: string };
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
  insurance?: { countries: Readonly<CountryKey[]>; url: string; };
  business: { idTypeKey: 'tax_id' | 'company_num'; number: string; owner?: string; };
  companyAddress: Address & { text: string; };
  phone: { raw: string; display: string; };
  whatsappBot?: string;
  trustingCompanies: TrustingCompanies[];
  crispId: string;
  telegram?: string;
  emailUsername: string;
  blog?: string;
  announcement?: string;
  socialLinks: { [key in SocialMedia]?: string };
  reviews: { links: ReviewLinks; public: boolean; };
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

export type ProductName = typeof PRODUCT_NAMES[number];
type Instruction = typeof PRODUCT_INSTRUCTIONS[number];
export interface Urgency {
  speed: typeof URGENCY_SPEED[number];
  fee: Price;
  isAppointment?: boolean;
}
type ProductVariationValidityByNationality = {
  type: 'validity';
  validity: typeof VALIDITIES[number];
  dependency: 'nationality';
  nationalities: CountryIso[];
  name: 'validity_6_months_by_nationality' | 'validity_2_years_by_nationality'
};
type ProductVariationFeeBase = {
  type: 'fee';
  fee: Price;
}
type ProductVariationFeeByNationality = ProductVariationFeeBase & {
  dependency: 'nationality';
  nationalities: CountryIso[];
  name: 'fee_by_nationality';
}
type ProductVariationFeeByMinAge = ProductVariationFeeBase & {
  dependency: 'min_age';
  age: number;
  name: 'fee_60_plus';
}
type ProductVariationStayLimitByNationality = {
  type: 'stay_limit';
  limit: number;
  dependency: 'nationality';
  nationalities: CountryIso[];
  name: 'stay_limit_by_nationality';
}
export type ProductVariation =
  ProductVariationValidityByNationality |
  ProductVariationFeeByNationality |
  ProductVariationFeeByMinAge |
  ProductVariationStayLimitByNationality;
export type ApplicableVariation = ProductVariation & {
  applicantId: Applicant['id'];
}

export interface Product {
  name: ProductName;
  country: CountryKey;
  docType: VisaDocType;
  docName: VisaDocName;
  intent: typeof INTENTS[number];
  entries: typeof ENTRY_TYPES[number];
  validity: typeof VALIDITIES[number];
  valid_since: typeof VALID_SINCE_OPTIONS[number];
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
  note?: I18nKey;
  variations?: ProductVariation[];
  variation_name?: ProductVariation['name'];
  replacement?: { active: boolean; }
}

export type Currency = typeof CURRENCIES[number];
export type Price = Record<Currency, number>;

export type FormStep = 'details' | 'payment' | 'review' | 'upload' | 'visa_select';
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
  }
}
export type FileTransferMethod = typeof FILE_TRANSFER_METHODS[number];

interface IndiaVisaForm extends BaseVisaForm {
  entry: Entry;
  business: {
    name: string; sector: string; phone: Phone; address: Address; website?: string;
  };
  applicants: IndiaApplicant[];
  fileTransferMethod: FileTransferMethod;
}
interface CanadaVisaForm extends BaseVisaForm {
  entry: Entry;
  applicants: CanadaApplicant[];
}
interface SriLankaVisaForm extends BaseVisaForm {
  entry: Entry;
  address: Address;
  stayAddress: string;
  applicants: SriLankaApplicant[];
}
interface MoroccoVisaForm extends BaseVisaForm {
  entry: Entry;
  applicants: MoroccoApplicant[];
  fileTransferMethod: FileTransferMethod;
}
interface NewZealandVisaForm extends BaseVisaForm {
  entry: Entry;
  applicants: NewZealandApplicant[];
  fileTransferMethod: FileTransferMethod;
}
interface VietnamVisaForm extends BaseVisaForm {
  entry: Entry;
  hotel: string;
  emergencyContact: EmergencyContact;
  applicants: VietnamApplicant[];
  fileTransferMethod: FileTransferMethod;
}
interface UsaVisaForm extends BaseVisaForm {
  emergencyContact: EmergencyContact;
  applicants: UsaApplicant[];
  fileTransferMethod: FileTransferMethod;
}
interface KoreaVisaForm extends BaseVisaForm {
  entry: Entry;
  stayAddress: string;
  children: AccompanyingChild[];
  applicants: KoreaApplicant[];
  fileTransferMethod: FileTransferMethod;
}
interface CambodiaVisaForm extends BaseVisaForm {
  entry: Entry;
  stayAddress: string;
  applicants: CambodiaApplicant[];
  fileTransferMethod: FileTransferMethod;
}
interface IsraelVisaForm extends BaseVisaForm {
  entry: Entry;
  applicants: IsraelApplicant[];
  fileTransferMethod: FileTransferMethod;
}
interface SaudiArabiaVisaForm extends BaseVisaForm {
  entry: Entry;
  applicants: SaudiArabiaApplicant[];
  fileTransferMethod: FileTransferMethod;
}
interface BahrainVisaForm extends BaseVisaForm {
  applicants: BahrainApplicant[];
  fileTransferMethod: FileTransferMethod;
}
interface IndonesiaVisaForm extends BaseVisaForm {
  stayAddress: string;
  applicants: IndonesiaApplicant[];
  fileTransferMethod: FileTransferMethod;
}
interface UkVisaForm extends BaseVisaForm {
  applicants: UkApplicant[];
  fileTransferMethod: FileTransferMethod;
}
interface TogoVisaForm extends BaseVisaForm {
  entry: Entry;
  emergencyContact: EmergencyContact;
  stayAddress: string;
  applicants: TogoApplicant[];
  fileTransferMethod: FileTransferMethod;
}
interface ThailandVisaForm extends BaseVisaForm {
  entry: Entry;
  stayAddress: string;
  applicants: ThailandApplicant[];
  fileTransferMethod: FileTransferMethod;
}
interface SchengenVisaForm extends BaseVisaForm {
  entry: Entry;
  applicants: SchengenApplicant[];
}

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

export type VisaFormWithFiles = Extract<VisaForm, {
  fileTransferMethod: FileTransferMethod;
  applicants: ApplicantWithFiles[]
}>;

export type BusinessVisaForm = Extract<VisaForm, { business: any }>;

export type CountryApplicantMap = { [K in CountryKey]: CountryFormMap[K]['applicants'][number] };

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
  }
}

export interface Discount {
  coupon: Coupon['code'];
  percent: number;
}


type CrossingLand = { type: 'land'; border: string; };
type CrossingSea = { type: 'sea'; ship: string; };
type CrossingAir = { type: 'air'; flight: string; };
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

export interface BaseApplicant {
  id: string;
}
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
  pastVisit: { visited: boolean; year: string; };
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
export type Applicant = VisaForm['applicants'][number];
export type ApplicantWithFiles = Extract<Applicant, { files: ApplicantFiles }>;
export type PayedVisaForm = VisaForm & { orderId: Order['id'] };

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
export type MaritalStatus = typeof MARITAL_STATUSES[number];
export interface FamilyMember {
  name: string;
  countryOfBirth: CountryIso;
}
export type Religion = typeof RELIGIONS[number];
export type Education = typeof EDUCATION[number];
export type Sex = typeof SEXES[number];
export interface Occupation {
  education: Education;
  status: OccupationStatus;
  name: string;
  seniority: JobSeniority;
  phone: Phone;
  address: Address;
}
export type JobSeniority = typeof JOB_SENIORITIES[number];
export type OccupationStatus = typeof OCCUPATION_STATUSES[number];
export interface Military {
  served: boolean;
  role: MilitaryRole;
  rank: MilitaryRank;
}
export type MilitaryRole = typeof MILITARY_ROLES[number];
export type MilitaryRank = typeof MILITARY_RANKS[number];
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
  }
}
export interface SaarcVisit {
  visited: boolean;
  countries: CountryIso[];
  year: number;
}

export type ApplicantPhotoType = typeof APPLICANT_PHOTO_TYPES[number];
export type ApplicantFiles = Partial<Record<ApplicantPhotoType, string>>;

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
  status: typeof ORDER_STATUSES[number];
}

export type PaymentProcessor = typeof PAYMENT_PROCESSORS[number];
export type PaymentLogo = typeof PAYMENT_PROCESSORS_LOGOS[number];

export interface Image {
  src: string;
  alt?: string;
  desc?: I18nKey;
  position?: string;
  width?: number;
  height?: number;
}
export interface Testimonial {
  name: string;
  body: string;
  date: string;
  img: string;
  url: string;
}
export interface Faq {
  q: string;
  a: string;
}

export interface SelectItem<V = string> {
  title: string;
  value: V;
}

export interface EmergencyContact {
  name: string;
  phone: Phone;
  address?: Address;
  relation?: string;
}

type ExtraNationalityNone = { status: 'none'; };
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
export type ExtraNationality = ExtraNationalityNone | ExtraNationalityPast | ExtraNationalityPresent;

export type EmailTemplate = typeof EMAIL_TEMPLATES[number];

export interface BlogPost {
  id: number;
  date: DateISO;
  modified: DateISO;
  title: {
    rendered: string;
  };
  slug: string;
  excerpt: {
    rendered: string;
  };
  link: string;
  author: string;
  _embedded: {
    author: { name: string; }[];
    'wp:featuredmedia': { media_details: { sizes: any } }[];
    'wp:term': WpTerm[][];
  }
  content: {
    rendered: string;
  };
}
export interface WpTerm {
  id: number;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
}
export interface BlogCategory {
  count: number;
  description: string;
  id: number;
  link: string;
  meta: [];
  name: string;
  parent: number;
  slug: string;
  taxonomy: string;
}

export interface ProductFeatures {
  product: Product;
  bullets: string[];
  note?: string;
}

export interface VisaFile {
  number: string;
  base64: string;
}
export interface VisaFileLink {
  number: string;
  url: string;
}

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

export interface ResendEmailReqBody {
  id: string;
  template: EmailTemplate;
  to?: string;
}

export interface PaymentData {
  id: string;
  formId: VisaForm['id'];
  processor: PaymentProcessor;
  amount: number;
  currency: string;
  completed: boolean;
  metadata?: {
    phone?: string;
  }
}

export interface BillRequest {
  formId: VisaForm['id'];
  company: {
    name: string;
    inn: string;
    kpp: string;
    address: string;
  };
}

export type FixRequestSource = 'form' | 'authorities';
export interface FixMeta {
  disabledCountries?: CountryKey[];
  enabledCountries?: CountryKey[];
  imageType?: 'face' | 'passport' | 'passport_2_pages';
  submissionRisk?: boolean;
  requiresDocumentRenewal?: boolean;
}

type FixIssueValue = 'photo_is_missing' | 'with_glasses' | 'additional_people' | 'head_body_not_straight' | 'hair_hiding_the_face' |
  'unnatural_facial_expression' | 'shoulder_line_missing' | 'not_white_background' | 'eyes_not_at_camera_level' |
  'shadow_light_on_face' | 'with_accessories' | 'face_cut_on_sides_top' | 'wrong_photo' | 'blurred_photo' |
  'without_shirt' | 'with_tank_top' | 'photo_from_passport' | 'black_and_white_face' | 'black_and_white_pass' |
  'cut_on_sides' | 'code_hidden_at_bottom' | 'passport_missing' | 'blurred_passport' | 'not_straight' |
  'with_shadow_light' | 'wrong_passport' | 'need_2_passport_pages' | 'suspected_wrong_details' |
  'missing_invitation_letter' | 'letter_not_in_english' | 'missing_business_card' | 'card_not_in_english' |
  'valid_less_than_6_months' | 'passport_5_years_or_less' | 'passport_not_biometric' |
  'expired_passport' | 'temporary_passport' | 'past_rejection' | 'criminal_record' | 'born_in_iran' |
  'born_in_iraq' | 'visit_in_cuba';
export interface FixIssue {
  value: FixIssueValue;
  label: string;
  meta?: FixMeta;
}
export interface FixIssueCategory {
  key: 'face_photo' | 'passport_photo' | 'business' | 'passport_expiry' | 'application_details';
  label: string;
  meta?: FixMeta;
  issues: FixIssue[];
}

export interface TbankNotificationBody {
  TerminalKey: string;
  OrderId: string;
  Success: boolean;
  Status: 'AUTHORIZED' | 'CONFIRMED' | 'REJECTED' | 'PARTIAL_REVERSED' | 'REVERSED' | 'REFUNDED' | 'PARTIAL_REFUNDED';
  PaymentId: number;
  ErrorCode: string;
  Amount: number;
  CardId: number;
  Pan: string;
  ExpDate: string;
  Token: string;
}
export interface SendContactMessageReqBody { name: string; email: string; msg: string; }
export interface SendResumeUrlReqBody { email: string; url: string; formId: BaseVisaForm['id']; }
export interface CreatePaymentIntentReqBody { form: VisaForm; currency: Currency; }
export interface CreatePayPalOrderReqBody { form: VisaForm; currency: Currency; }
export interface TbankPaymentUrlReqBody { form: VisaForm; successQueryParams: Record<string, string>; }
export interface CapturePaypalPaymentReqBody { id: string; formId: VisaForm['id']; }
export interface SendOrderStatusReqBody { email: string; orderId: Order['id']; }
export interface GetVisaDownloadUrlsQuery { email: string; orderId: Order['id']; }
export interface LogReqBody { error: Error; props?: object; }
export interface SendClientConfirmationReqBody { id: Order['id']; formId: Order['form_id']; }
export interface AddOrderRecordReqBody { order: Order; }
export interface SendBillRequestReqBody extends BillRequest {};
export interface SendMobilePaymentAlertReqBody { formId: VisaForm['id']; transferId: string; phone: string; }
export interface RecordSyncReqBody { id: Order['id']; status: Order['status']; }
export interface SendFixRequestEmailReqBody {
  formId: VisaForm['id'];
  applicantId: Applicant['id'];
  email: string;
  source: FixRequestSource;
  issues: Record<FixIssueCategory['key'], FixIssue[]>;
}
export interface UploadPhotoReqBody {
  formId: VisaForm['id'];
  applicantId: string;
  type: ApplicantPhotoType;
  base64: string;
}
export type SendVisaReqBody = { 
  email: string; 
  orderId: Order['id']; 
  productName: ProductName; 
} & (
  { files: VisaFile[]; } | { links: VisaFileLink[]; }
);

interface _EmailPropsMap {
  'wrapper': {};
  'new_order': ComponentProps<typeof NewOrderEmail>;
  'contact': ComponentProps<typeof ContactEmail>;
  'resume_url': ComponentProps<typeof ResumeUrlEmail>;
  'form_abandonment': ComponentProps<typeof FormAbandonmentEmail>;
  'order_recieved': ComponentProps<typeof OrderRecievedEmail>;
  'approved': ComponentProps<typeof ApprovedEmail>;
  'coupon_used': ComponentProps<typeof CouponUsedEmail>;
  'status': ComponentProps<typeof OrderStatusEmail>;
  'bill_request': ComponentProps<typeof RequestForBillEmail>;
  'bill_request_received': ComponentProps<typeof BillRequestReceivedEmail>;
  'mobile_payment': ComponentProps<typeof MobilePaymentEmail>;
  'onetime_coupon': ComponentProps<typeof OnetimeCouponEmail>;
  'fix': ComponentProps<typeof FixEmail>;
}
export type EmailPropsMap = { [T in EmailTemplate]: _EmailPropsMap[T] }

export interface SentEmail {
  id: string;
  email: string;
  template: EmailTemplate;
}

type ExtractSetupProps<T> = T extends { setup?(props: infer P, ...rest: any[]): any } ?
  P extends any ? P : never
  : never;
type ExtractConstructedProps<T> = T extends { new (...args: any[]): { $props: infer X } } ?
  X extends Record<string, any> ? X : never
  : never;
type ComponentProps<T> = Pick<ExtractConstructedProps<T>, keyof ExtractSetupProps<T>>;

type Join<K, P> = K extends string | number
? P extends string | number ? `${K}.${P}` : never
: never;
export type NestedKeys<T> = {
  [K in keyof T]: T[K] extends object
    ? K extends string | number
      ? `${K}` | Join<K, NestedKeys<T[K]>>
      : never
    : K
}[keyof T];