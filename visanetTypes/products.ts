import type { Urgency, Product, CountryIso } from "~/types";

const PRIORITY_TYPICAL_PRICE: Urgency['fee'] = { ils: 99, rub: 1990, sek: 290, usd: 25, kzt: 11990 };
const PRIORITY_ONE_DAY: Urgency = { speed: 'next_day', fee: PRIORITY_TYPICAL_PRICE };
const PRIORITY_FEW_HOURS: Urgency = { speed: 'few_hours', fee: PRIORITY_TYPICAL_PRICE };

const INDIA_INSTRUCTIONS: Product['instructions'] = ['print', '2_passport_pages', 'return_ticket'];
const indiaMonth: Product = {
  name: 'india_tourist_month',
  country: 'india',
  docType: 'evisa',
  docName: 'eVisa',
  days_to_use: 30,
  entries: "double",
  price: {
    usd: 49,
    ils: 179,
    sek: 499,
    rub: 4990,
    kzt: 29990
  },
  intent: "tourism",
  validity: "month",
  valid_since: 'entry',
  wait: 3,
  photo_types: ['face', 'passport'],
  urgencies: [PRIORITY_ONE_DAY],
  instructions: [...INDIA_INSTRUCTIONS]
};
const indiaYear: Product = {
  name: 'india_tourist_year',
  country: 'india',
  docType: 'evisa',
  docName: 'eVisa',
  entries: "multiple",
  price: {
    usd: 69,
    ils: 249,
    sek: 699,
    rub: 6990,
    kzt: 42990
  },
  stay_limit: 90,
  calendar_stay_limit: 180,
  intent: "tourism",
  validity: "year",
  valid_since: 'approval',
  wait: 3,
  photo_types: ['face', 'passport'],
  urgencies: [PRIORITY_ONE_DAY],
  instructions: ['stay_reset', ...INDIA_INSTRUCTIONS]
};
const indiaFiveYears: Product = {
  name: 'india_tourist_5_years',
  country: 'india',
  docType: 'evisa',
  docName: 'eVisa',
  entries: "multiple",
  price: {
    usd: 119,
    ils: 399,
    sek: 1199,
    rub: 9990,
    kzt: 77990
  },
  stay_limit: 90,
  calendar_stay_limit: 180,
  intent: "tourism",
  validity: "5_years",
  valid_since: 'approval',
  wait: 3,
  photo_types: ['face', 'passport'],
  urgencies: [PRIORITY_ONE_DAY],
  instructions: ['stay_reset', ...INDIA_INSTRUCTIONS]
};
const indiaBusiness: Product = {
  name: 'india_business_year',
  country: 'india',
  docType: 'evisa',
  docName: 'eVisa',
  entries: "multiple",
  price: {
    usd: 119,
    ils: 399,
    sek: 1199,
    rub: 12990,
    kzt: 89990
  },
  stay_limit: 180,
  intent: "business",
  validity: "year",
  valid_since: 'approval',
  wait: 3,
  photo_types: ['face', 'passport', 'card', 'invitation'],
  urgencies: [PRIORITY_ONE_DAY],
  instructions: ['stay_reset', ...INDIA_INSTRUCTIONS]
};

const canadaFiveYears: Product = {
  name: 'canada_5_years',
  country: 'canada',
  docType: 'eta',
  docName: 'eTA',
  entries: "multiple",
  price: {
    usd: 29,
    ils: 99,
    sek: 299,
    rub: 3690,
    kzt: 23990
  },
  stay_limit: 180,
  intent: 'general',
  validity: "5_years",
  valid_since: 'approval',
  wait: 3,
  urgencies: [PRIORITY_FEW_HOURS],
  instructions: ['dont_print']
};

const sriLankaMonth: Product = {
  name: 'sri_lanka_month',
  country: 'sri_lanka',
  docType: 'evisa',
  docName: 'eVisa',
  entries: 'double',
  price: {
    usd: 89,
    ils: 299,
    sek: 899,
    rub: 2990,
    kzt: 18990
  },
  intent: 'tourism',
  validity: 'month',
  valid_since: 'entry',
  wait: 2,
  days_to_use: 180,
  urgencies: [PRIORITY_FEW_HOURS],
  instructions: ['return_ticket']
};

const moroccoMonth: Product = {
  name: 'morocco_tourist_6_months',
  country: 'morocco',
  docType: 'evisa',
  docName: 'eVisa',
  price: {
    usd: 119,
    ils: 399,
    sek: 1199,
    rub: 9900,
    kzt: 59990
  },
  wait: 3,
  intent: 'tourism',
  validity: '6_months',
  stay_limit: 30,
  valid_since: 'approval',
  entries: 'single',
  urgencies: [{
    speed: 'next_day',
    fee: { ils: 199, rub: 3990, sek: 499, usd: 39, kzt: 19990 }
  }],
  photo_types: ['face', 'passport'],
  instructions: ['print', 'travel_documents', 'return_ticket']
};


const newZealandTwoYears: Product = {
  name: 'new_zealand_2_years',
  country: 'new_zealand',
  docType: 'eta',
  docName: 'NZeTA',
  intent: 'tourism',
  validity: '2_years',
  valid_since: 'approval',
  entries: 'multiple',
  wait: 2,
  stay_limit: 90,
  price: {
    usd: 49,
    ils: 229,
    sek: 699,
    rub: 8490,
    kzt: 49990
  },
  urgencies: [PRIORITY_ONE_DAY],
  photo_types: ['face'],
  instructions: ['return_ticket']
};

const VIETNAM_URGENCIES: Urgency[] = [
  {
    speed: '5_days',
    fee: { ils: 149, usd: 39, sek: 399, rub: 2990, kzt: 18990 }
  }, {
    speed: '3_days',
    fee: { ils: 299, usd: 79, sek: 699, rub: 4990, kzt: 29990 }
  }, {
    speed: '1_2_days',
    fee: { ils: 399, usd: 99, sek: 899, rub: 6990, kzt: 43990 }
  }
];
const vietnamSingle: Product = {
  name: 'vietnam_3_months_single',
  country: 'vietnam',
  docType: 'evisa',
  docName: 'eVisa',
  intent: 'tourism',
  validity: '3_months',
  valid_since: 'specified',
  entries: 'single',
  wait: 7,
  price: {
    usd: 49,
    ils: 199,
    sek: 429,
    rub: 5290,
    kzt: 29990
  },
  urgencies: VIETNAM_URGENCIES,
  photo_types: ['face', 'passport'],
  instructions: ['print', 'return_ticket_and_accommodation']
};
const vietnamMulti: Product = {
  name: 'vietnam_3_months_multi',
  country: 'vietnam',
  docType: 'evisa',
  docName: 'eVisa',
  intent: 'tourism',
  validity: '3_months',
  valid_since: 'specified',
  entries: 'multiple',
  wait: 7,
  price: {
    usd: 79,
    ils: 299,
    sek: 759,
    rub: 9990,
    kzt: 59990
  },
  urgencies: VIETNAM_URGENCIES,
  photo_types: ['face', 'passport'],
  instructions: ['print', 'return_ticket_and_accommodation']
};
const vietnamSingleBusiness: Product = {
  name: 'vietnam_3_months_single_business',
  country: 'vietnam',
  docType: 'evisa',
  docName: 'eVisa',
  intent: 'business',
  validity: '3_months',
  valid_since: 'specified',
  entries: 'single',
  wait: 7,
  price: {
    usd: 49,
    ils: 299,
    sek: 429,
    rub: 5290,
    kzt: 29990
  },
  urgencies: VIETNAM_URGENCIES,
  photo_types: ['face', 'passport'],
  instructions: ['print', 'return_ticket_and_accommodation']
};
const vietnamMultiBusiness: Product = {
  name: 'vietnam_3_months_multi_business',
  country: 'vietnam',
  docType: 'evisa',
  docName: 'eVisa',
  intent: 'business',
  validity: '3_months',
  valid_since: 'specified',
  entries: 'multiple',
  wait: 7,
  price: {
    usd: 119,
    ils: 399,
    sek: 999,
    rub: 9990,
    kzt: 59990
  },
  urgencies: VIETNAM_URGENCIES,
  photo_types: ['face', 'passport'],
  instructions: ['print', 'return_ticket_and_accommodation']
};

const usaTwoYears: Product = {
  name: 'usa_2_years',
  country: 'usa',
  docType: 'eta',
  docName: 'ESTA',
  intent: 'general',
  validity: '2_years',
  valid_since: 'approval',
  stay_limit: 90,
  entries: 'multiple',
  wait: 3,
  price: {
    usd: 39,
    ils: 159,
    sek: 599,
    rub: 4900,
    kzt: 29990
  },
  urgencies: [PRIORITY_ONE_DAY],
  photo_types: ['face', 'passport'],
  instructions: ['2_passport_pages', 'dont_print', 'stay_reset', 'return_ticket']
};

const KOREA_30_DAYS_STAY_LIMIT_NATIONALITIES: CountryIso[] = [
  'ALB', 'AND', 'BHR', 'BIH', 'BRN', 'CYP', 'SWZ', 'FJI', 'GUY', 'VAT', 'HND', 'KAZ', 'KIR',
  'MHL', 'MUS', 'FSM', 'MCO', 'MNE', 'NRU', 'NCL', 'OMN', 'PLW', 'PRY', 'WSM', 'SMR', 'SAU',
  'SYC', 'SLB', 'ZAF', 'TON', 'TUN', 'TUV'
];
const koreaThreeYears: Product = {
  name: 'korea_3_years',
  country: 'korea',
  docType: 'eta',
  docName: 'K-ETA',
  intent: 'general',
  validity: '3_years',
  valid_since: 'approval',
  entries: 'multiple',
  wait: 3,
  stay_limit: 60,
  price: {
    usd: 29,
    ils: 99,
    sek: 299,
    rub: 2990,
    kzt: 19990
  },
  urgencies: [PRIORITY_ONE_DAY],
  photo_types: ['face', 'passport'],
  instructions: ['print', 'stay_reset'],
  variations: [
    {
      type: 'stay_limit',
      limit: 30,
      dependency: 'nationality',
      nationalities: KOREA_30_DAYS_STAY_LIMIT_NATIONALITIES,
      name: 'stay_limit_by_nationality'
    },
    {
      type: 'validity',
      validity: '2_years',
      dependency: 'nationality',
      nationalities: ['ISR'],
      name: 'validity_2_years_by_nationality'
    }
  ]
};
const koreaThreeYears30Stay: Product = {
  ...koreaThreeYears,
  name: 'korea_3_years_30_stay',
  stay_limit: 30,
  variation_name: 'stay_limit_by_nationality',
  replacement: { active: false }
};
const koreaTwoYears: Product = {
  ...koreaThreeYears,
  name: 'korea_2_years',
  validity: '2_years',
  variation_name: 'validity_2_years_by_nationality',
  replacement: { active: false }
};

const cambodiaMonth: Product = {
  name: 'cambodia_month',
  country: 'cambodia',
  docType: 'evisa',
  docName: 'eVisa',
  intent: 'tourism',
  validity: 'month',
  valid_since: 'entry',
  days_to_use: 90,
  entries: 'single',
  wait: 5,
  price: {
    usd: 59,
    ils: 199,
    sek: 590,
    rub: 5990,
    kzt: 37990
  },
  photo_types: ['passport'],
  instructions: ['print_twice']
};

const israelTwoYears: Product = {
  name: 'israel_2_years',
  country: 'israel',
  docType: 'eta',
  docName: 'ETA-IL',
  entries: 'multiple',
  price: {
    usd: 29,
    ils: 99,
    sek: 290,
    rub: 2990,
    kzt: 17990
  },
  intent: 'general',
  validity: '2_years',
  valid_since: 'approval',
  wait: 3,
  stay_limit: 90,
  urgencies: [PRIORITY_ONE_DAY],
  photo_types: ['passport'],
  instructions: ['stay_reset']
};

const SAUDI_SIX_MONTHS_VALIDITY_NATIONALITIES: CountryIso[] = [
  'ALB', 'AZE', 'BHS', 'BRB', 'GEO', 'GRD', 'KAZ', 'KGZ', 'MDV', 'MUS', 'PAN', 'RUS', 'KNA', 'SYC', 'ZAF', 'TJK', 'TUR', 'UZB'
];
const saudiArabiaYear: Product = {
  name: 'saudi_arabia_year',
  country: 'saudi_arabia',
  docType: 'evisa',
  docName: 'eVisa',
  wait: 3,
  stay_limit: 90,
  entries: 'multiple',
  validity: 'year',
  valid_since: 'approval',
  price: {
    usd: 149,
    ils: 549,
    sek: 1490,
    rub: 12990,
    kzt: 89990
  },
  intent: 'tourism',
  urgencies: [PRIORITY_ONE_DAY],
  photo_types: ['face', 'passport'],
  instructions: ['print', 'return_ticket_and_accommodation'],
  variations: [
    {
      type: 'validity',
      validity: '6_months',
      dependency: 'nationality',
      nationalities: SAUDI_SIX_MONTHS_VALIDITY_NATIONALITIES,
      name: 'validity_6_months_by_nationality'
    },
    {
      type: 'fee',
      fee: { usd: 59, ils: 180, sek: 590, rub: 4990, kzt: 29990 },
      dependency: 'min_age',
      age: 60,
      name: 'fee_60_plus'
    }
  ]
};
const saudiArabia6Months: Product = {
  ...saudiArabiaYear,
  name: 'saudi_arabia_6_months',
  validity: '6_months',
  variation_name: 'validity_6_months_by_nationality',
  replacement: { active: false }
};

const bahrainTwoWeeks: Product = {
  name: 'bahrain_2_weeks',
  country: 'bahrain',
  docType: 'evisa',
  docName: 'eVisa',
  wait: 5,
  days_to_use: 90,
  entries: 'single',
  validity: '2_weeks',
  valid_since: 'entry',
  price: {
    usd: 49,
    ils: 199,
    sek: 499,
    rub: 4990,
    kzt: 29990
  },
  intent: 'tourism',
  photo_types: ['passport', 'return_ticket', 'booking'],
  instructions: ['print', 'return_ticket']
};
const bahrain3Months: Product = {
  name: 'bahrain_3_months',
  country: 'bahrain',
  docType: 'evisa',
  docName: 'eVisa',
  wait: 5,
  days_to_use: 90,
  stay_limit: 30,
  entries: 'multiple',
  validity: '3_months',
  valid_since: 'entry',
  price: {
    usd: 79,
    ils: 299,
    sek: 799,
    rub: 7990,
    kzt: 49990
  },
  intent: 'tourism',
  photo_types: ['passport', 'return_ticket', 'booking'],
  instructions: ['print', 'return_ticket']
};
const bahrainYear: Product = {
  name: 'bahrain_year',
  country: 'bahrain',
  docType: 'evisa',
  docName: 'eVisa',
  wait: 5,
  days_to_use: 90,
  stay_limit: 90,
  entries: 'multiple',
  validity: 'year',
  valid_since: 'entry',
  price: {
    usd: 599,
    ils: 149,
    sek: 1499,
    rub: 14990,
    kzt: 89990
  },
  intent: 'tourism',
  photo_types: ['passport', 'return_ticket', 'booking'],
  instructions: ['print', 'return_ticket']
};

const indonesia2Months: Product = {
  name: 'indonesia_2_months',
  country: 'indonesia',
  docType: 'evisa',
  docName: 'eVisa',
  wait: 5,
  days_to_use: 90,
  entries: 'single',
  validity: '2_months',
  valid_since: 'entry',
  price: {
    usd: 139,
    ils: 549,
    sek: 1490,
    rub: 11990,
    kzt: 75990
  },
  intent: 'general',
  photo_types: ['face', 'passport', 'bank'],
  instructions: ['print']
};
const indonesiaYear: Product = {
  name: 'indonesia_year',
  country: 'indonesia',
  docType: 'evisa',
  docName: 'eVisa',
  wait: 5,
  days_to_use: 90,
  stay_limit: 60,
  entries: 'multiple',
  validity: 'year',
  valid_since: 'entry',
  price: {
    usd: 279,
    ils: 1099,
    sek: 2990,
    rub: 23990,
    kzt: 149990
  },
  intent: 'general',
  photo_types: ['face', 'passport', 'return_ticket', 'bank'],
  instructions: ['print']
};
const indonesia2Years: Product = {
  name: 'indonesia_2_years',
  country: 'indonesia',
  docType: 'evisa',
  docName: 'eVisa',
  wait: 5,
  days_to_use: 90,
  stay_limit: 60,
  entries: 'multiple',
  validity: '2_years',
  valid_since: 'entry',
  price: {
    usd: 559,
    ils: 2190,
    sek: 5990,
    rub: 47990,
    kzt: 299990
  },
  intent: 'general',
  photo_types: ['face', 'passport', 'return_ticket', 'bank'],
  instructions: ['print']
};
const indonesia5Years: Product = {
  name: 'indonesia_5_years',
  country: 'indonesia',
  docType: 'evisa',
  docName: 'eVisa',
  wait: 5,
  days_to_use: 90,
  stay_limit: 60,
  entries: 'multiple',
  validity: '5_years',
  valid_since: 'entry',
  price: {
    usd: 1390,
    ils: 5490,
    sek: 14900,
    rub: 119900,
    kzt: 749900
  },
  intent: 'general',
  photo_types: ['face', 'passport', 'return_ticket', 'bank'],
  instructions: ['print']
};

const ukTwoYears: Product = {
  name: 'uk_2_years',
  country: 'uk',
  docType: 'eta',
  docName: 'UK-ETA',
  wait: 3,
  days_to_use: 180,
  stay_limit: 180,
  entries: 'multiple',
  validity: '2_years',
  valid_since: 'entry',
  price: {
    usd: 49,
    ils: 179,
    sek: 449,
    rub: 4990,
    kzt: 29990
  },
  intent: 'tourism',
  photo_types: ['face', 'passport'],
  urgencies: [PRIORITY_FEW_HOURS],
  instructions: ['dont_print']
};

const togoTwoWeeksSingle: Product = {
  name: 'togo_15_days_single',
  country: 'togo',
  docType: 'evisa',
  docName: 'eVisa',
  validity: '15_days',
  valid_since: 'specified',
  wait: 3,
  entries: 'single',
  intent: 'general',
  price: {
    usd: 69,
    sek: 779,
    ils: 299,
    rub: 7990,
    kzt: 49990
  },
  instructions: ['print', 'return_ticket'],
  photo_types: ['face', 'passport', 'booking'],
  urgencies: [PRIORITY_ONE_DAY]
};
const togoTwoWeeksMulti: Product = {
  name: 'togo_15_days_multi',
  country: 'togo',
  docType: 'evisa',
  docName: 'eVisa',
  validity: '2_weeks',
  valid_since: 'specified',
  wait: 3,
  entries: 'multiple',
  intent: 'general',
  price: {
    usd: 89,
    sek: 949,
    ils: 349,
    rub: 9990,
    kzt: 59990
  },
  instructions: ['print', 'return_ticket'],
  photo_types: ['face', 'passport', 'booking'],
  urgencies: [PRIORITY_ONE_DAY]
};
const togoMonth: Product = {
  name: 'togo_month',
  country: 'togo',
  docType: 'evisa',
  docName: 'eVisa',
  validity: 'month',
  valid_since: 'specified',
  wait: 3,
  entries: 'multiple',
  intent: 'general',
  price: {
    usd: 99,
    sek: 1190,
    ils: 399,
    rub: 12990,
    kzt: 79990
  },
  instructions: ['print', 'return_ticket'],
  photo_types: ['face', 'passport', 'booking'],
  urgencies: [PRIORITY_ONE_DAY]
};
const togo3Months: Product = {
  name: 'togo_3_months',
  country: 'togo',
  docType: 'evisa',
  docName: 'eVisa',
  validity: '3_months',
  valid_since: 'specified',
  wait: 3,
  entries: 'multiple',
  intent: 'general',
  price: {
    usd: 139,
    rub: 14990,
    kzt: 94990,
    sek: 1490,
    ils: 499
  },
  instructions: ['print', 'return_ticket'],
  photo_types: ['face', 'passport', 'booking'],
  urgencies: [PRIORITY_ONE_DAY]
};

const thailand3Months: Product = {
  name: 'thailand_3_months',
  country: 'thailand',
  docType: 'evisa',
  docName: 'eVisa',
  validity: '3_months',
  wait: 10,
  stay_limit: 60,
  valid_since: 'approval',
  entries: 'single',
  intent: 'tourism',
  price: {
    usd: 119,
    ils: 399,
    sek: 990,
    rub: 9990,
    kzt: 29990
  },
  instructions: ['print', 'return_ticket'],
  photo_types: ['face', 'passport', 'booking', 'address_proof', 'travel_ticket'],
};
const thailand6Months: Product = {
  name: 'thailand_6_months',
  country: 'thailand',
  docType: 'evisa',
  docName: 'eVisa',
  validity: '6_months',
  wait: 10,
  stay_limit: 60,
  valid_since: 'approval',
  entries: 'multiple',
  intent: 'tourism',
  price: {
    usd: 229,
    ils: 799,
    sek: 1990,
    rub: 19990,
    kzt: 99900
  },
  instructions: ['print', 'return_ticket'],
  photo_types: ['face', 'passport', 'booking', 'address_proof', 'travel_ticket'],
};
const thailand5Years: Product = {
  name: 'thailand_5_years',
  country: 'thailand',
  docType: 'evisa',
  docName: 'DTV',
  validity: '5_years',
  wait: 21,
  stay_limit: 180,
  valid_since: 'approval',
  entries: 'multiple',
  intent: 'general',
  consulate_payment_countries: ['ISR', 'RUS'],
  price: {
    usd: 699,
    ils: 1990,
    sek: 6990,
    rub: 79990,
    kzt: 499900
  },
  instructions: ['print', 'return_ticket'],
  photo_types: ['face', 'passport', 'address_proof', 'bank', 'occupation']
};

const schengen: Product = {
  name: 'schengen',
  country: 'schengen',
  docType: 'visa',
  docName: 'Schengen Visa (Type C)',
  intent: 'general',
  validity: '3_months',
  valid_since: 'entry',
  entries: 'multiple',
  fee_partial: true,
  wait: 30,
  six_months_stay_limit: 90,
  price: {
    rub: 11900,
    usd: 149,
    ils: 599,
    sek: 1490,
    kzt: 89990
  },
  urgencies: [
    {
      fee: { usd: 99, ils: 399, sek: 990, rub: 14990, kzt: 59990 },
      speed: '5_15_days',
      isAppointment: true
    }
  ],
  note: 'products.notes.form_and_appointment_only',
  instructions: []
};

const PRODUCTS: Product[] = [
  indiaMonth, indiaYear, indiaFiveYears, indiaBusiness,
  canadaFiveYears,
  sriLankaMonth,
  moroccoMonth,
  newZealandTwoYears,
  vietnamSingle, vietnamMulti, vietnamSingleBusiness, vietnamMultiBusiness,
  usaTwoYears,
  koreaThreeYears, koreaThreeYears30Stay, koreaTwoYears,
  cambodiaMonth,
  israelTwoYears,
  saudiArabiaYear, saudiArabia6Months,
  bahrainTwoWeeks, bahrain3Months, bahrainYear,
  indonesia2Months, indonesiaYear, indonesia2Years, indonesia5Years,
  ukTwoYears,
  togoTwoWeeksSingle, togoTwoWeeksMulti, togoMonth, togo3Months, 
  thailand3Months, thailand6Months, thailand5Years,
  schengen
];

export default PRODUCTS;