export const SITE_NAME = 'Visanet';
export const COMPANY_NAME = 'eVisanet Ltd';
export const COMPANY_NUM = '12097065';
export const COMPANY_INN = '771980103247';
export const COMPANY_ACTIVE_SINCE = 2019;
export const TEST_SUBDOMAIN = 'test';
export const DEV_PORT = 3000;
export const PRIMARY_COLOR = '#1d41ff';
export const SECONDARY_COLOR = '#021cb3';
export const TERTIARY_COLOR = '#4fedb8';
export const DIM_COLOR = '#18255e';

export const DOMAINS = [
  `localhost:${DEV_PORT}`,
  'visanet.co.il',
  'visanet.co',
  'visanet.se',
  'visanet.ru',
  'visanet.kz',
  `${TEST_SUBDOMAIN}.visanet.co`,
  `${TEST_SUBDOMAIN}.visanet.se`,
  `${TEST_SUBDOMAIN}.visanet.ru`,
  `${TEST_SUBDOMAIN}.visanet.kz`,
] as const;

export const BRANCHES = ['se', 'co', 'il', 'ru', 'kz'] as const;
export const LOCALE_CODES = ['sv', 'en', 'he', 'ru', 'ru-KZ'] as const;
export const LANGUAGES = ['sv', 'en', 'he', 'ru'] as const;

export const VISA_COUNTRY_KEYS = [
  'india',
  'canada',
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
  'sri_lanka',
  'togo',
  'thailand',
  'schengen',
] as const;

export const PRODUCT_NAMES = [
  'india_tourist_month',
  'india_tourist_year',
  'india_tourist_5_years',
  'india_business_year',
  'canada_5_years',
  'sri_lanka_month',
  'morocco_tourist_6_months',
  'new_zealand_2_years',
  'vietnam_3_months_single',
  'vietnam_3_months_multi',
  'vietnam_3_months_single_business',
  'vietnam_3_months_multi_business',
  'usa_2_years',
  'korea_3_years',
  'korea_3_years_30_stay',
  'korea_2_years',
  'cambodia_month',
  'israel_2_years',
  'saudi_arabia_6_months',
  'saudi_arabia_year',
  'bahrain_2_weeks',
  'bahrain_3_months',
  'bahrain_year',
  'indonesia_2_months',
  'indonesia_year',
  'indonesia_2_years',
  'indonesia_5_years',
  'uk_2_years',
  'togo_15_days_single',
  'togo_15_days_multi',
  'togo_month',
  'togo_3_months',
  'thailand_3_months',
  'thailand_6_months',
  'thailand_5_years',
  'schengen',
] as const;

export const UNINDEXED_ROUTES = ['/admin', '/admin/*', '/success', '/failure'];
export const ERRORS = [
  'server',
  'bad_coupon',
  'expired_coupon',
  'used_coupon',
  'resume_fail',
  'photo_upload',
  'revision',
] as const;
export const CURRENCIES = ['ils', 'usd', 'sek', 'rub', 'kzt'] as const;
export const PAYMENT_PROCESSORS = [
  'stripe',
  'paypal',
  'tbank',
  'bill',
  'bit',
  'paybox',
] as const;
export const MOBILE_PAYMENT_PROCESSORS = ['bit', 'paybox'] as const;
export const PAYMENT_PROCESSORS_LOGOS = [
  'visa',
  'mastercard',
  'amex',
  'diners',
  'paypal',
  'mir',
  'bit',
  'paybox',
] as const;
export const SEXES = ['m', 'f'] as const;
export const APPLICANT_PHOTO_TYPES = [
  'face',
  'passport',
  'card',
  'invitation',
  'return_ticket',
  'booking',
  'bank',
  'address_proof',
  'occupation',
  'travel_ticket',
] as const;
export const FILE_TRANSFER_METHODS = [
  'form',
  'email',
  'whatsapp',
  'later',
] as const;
export const RELIGIONS = [
  'judaism',
  'christianity',
  'islam',
  'hindu',
  'other',
] as const;
export const MARITAL_STATUSES = [
  'single',
  'married',
  'divorced',
  'widowed',
] as const;
export const OCCUPATION_STATUSES = [
  'employee',
  'self_employed',
  'retired',
  'unemployed',
  'student',
  'underage',
] as const;
export const JOB_SENIORITIES = ['0-1', '2-5', '6-10', '11-19', '20+'] as const;
export const EDUCATION = [
  'highschool',
  'professional',
  'academic',
  'other',
] as const;
export const MILITARY_ROLES = ['fighter', 'support', 'office'] as const;
export const MILITARY_RANKS = [
  'private',
  'corporal',
  'sergeant',
  'staff_sergeant',
  'nco',
  'officer',
  'other',
] as const;
export const NATIONALITY_ACQUIRED_BY = [
  'birth',
  'parents',
  'naturalization',
] as const;
export const NATIONALITY_STATUSES = ['none', 'past', 'present'] as const;
export const VALIDITIES = [
  '2_weeks',
  '15_days',
  'month',
  '2_months',
  '3_months',
  '6_months',
  'year',
  '2_years',
  '3_years',
  '5_years',
] as const;
export const VALID_SINCE_OPTIONS = ['approval', 'entry', 'specified'] as const;
export const INTENTS = ['tourism', 'business', 'general'] as const;
export const ENTRY_TYPES = ['single', 'double', 'multiple'] as const;
export const VISA_DOC_TYPES = ['evisa', 'eta', 'visa'] as const;
export const VISA_DOC_NAMES = [
  'eVisa',
  'eTA',
  'NZeTA',
  'ETA-IL',
  'UK-ETA',
  'ESTA',
  'K-ETA',
  'DTV',
  'Schengen Visa (Type C)',
] as const;
export const URGENCY_SPEED = [
  'few_hours',
  'next_day',
  '1_2_days',
  '3_days',
  '5_days',
  '5_15_days',
] as const;

export const EMAIL_TEMPLATES = [
  'wrapper',
  'contact',
  'order_recieved',
  'new_order',
  'resume_url',
  'form_abandonment',
  'approved',
  'coupon_used',
  'status',
  'bill_request',
  'bill_request_received',
  'mobile_payment',
  'onetime_coupon',
  'fix',
] as const;
export const PRODUCT_INSTRUCTIONS = [
  'print',
  'print_twice',
  'dont_print',
  '2_passport_pages',
  'return_ticket',
  'stay_reset',
  'travel_documents',
  'return_ticket_and_accommodation',
] as const;
export const ORDER_STATUSES = [
  'active',
  'completed',
  'issue',
  'canceled',
] as const;

export const RECAPTCHA_TOKEN_HEADER = 'X-Recaptcha-Token';
export const AUTH_TOKEN_HEADER = 'X-Admin-Auth';
export const PAYPAL_CAPTURE_HEADER = 'X-Paypal-Capture-Token';
export const CREATE_ORDER_MANUALLY_HEADER = 'X-Create-Order-Manually';
export const N8N_AUTHORIZATION_HEADER = 'X-n8n-Authorization';

export const RESUME_TOKEN_QUERY_KEY = 'resume_token';

export const COUPON_COOKIE = 'coupon';

export const MAX_QUANTITY = 10;

export const CREATED_TIMESTAMP_KEY = 'created_at';
export const UPDATED_TIMESTAMP_KEY = 'updated_at';

export const LABEL_COLORS = [
  'primary',
  'tertiary',
  'success',
  'info',
  'warning',
  'error',
];

export const MAX_REQUEST_SIZE = 4000000; // 4MB

export const SENTRY_APPLICATION_KEY = 'vizi';

export const POSTHOG_PUBLIC_KEY =
  'phc_vONtw8Nm3X6iT3zuWvo7dB8DwOJ4PqKCpXMf4oRR1se';
export const POSTHOG_HOST = 'https://us.i.posthog.com';
