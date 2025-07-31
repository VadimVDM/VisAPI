export class N8nPassportDto {
  nationality?: string; // Optional for UK ETA
  firstName: string;
  lastName: string;
  sex?: string; // Optional for UK ETA
  dateOfBirth?: string; // Optional for UK ETA
  countryOfBirth?: string; // Optional for UK ETA
  number?: string; // Optional for UK ETA
  dateOfIssue?: string; // Optional for UK ETA
  dateOfExpiry?: string; // Optional for UK ETA
  placeOfIssue?: string; // Optional for some visa types
}

export class N8nPastVisitDto {
  visited: boolean;
  year: string;
}

export class N8nAddressDto {
  line: string;
  city: string;
  country: string;
  setBy?: number; // Optional for UK ETA
}

export class N8nPhoneDto {
  code: string;
  number: string;
}

export class N8nOccupationDto {
  education: string;
  status: string;
  name: string;
  seniority: string;
  phone: N8nPhoneDto;
  address: N8nAddressDto;
}

export class N8nExtraNationalityDto {
  status: string;
}

export class N8nFamilyDto {
  father: {
    name: string;
    countryOfBirth: string;
  };
  mother: {
    name: string;
    countryOfBirth: string;
  };
  marital: {
    status: string;
    spouse: {
      name: string;
      countryOfBirth: string;
    };
  };
}

export class N8nFilesDto {
  face: string;
  passport: string;
  card: string;
  invitation: string;
  return_ticket: string;
  booking: string;
  bank: string;
  address_proof: string;
  occupation: string;
  travel_ticket: string;
}

export class N8nMilitaryDto {
  served: boolean;
  role?: string;
  rank?: string;
}

export class N8nPastTravelsDto {
  pastVisit?: N8nPastVisitDto;
  rejection?: string;
  SAARC?: {
    visited: boolean;
    countries: string[];
    year: number;
  };
}

export class N8nLastTravelDto {
  traveled: boolean;
  country?: string;
  from?: string;
  until?: string;
}

export class N8nApplicantDto {
  id: string;
  passport: N8nPassportDto;
  pastVisit?: N8nPastVisitDto; // Optional for backward compatibility
  address?: N8nAddressDto; // Optional for Morocco visas
  occupation: N8nOccupationDto | string; // Can be object or simple string (Saudi/Morocco visas)
  extraNationality?: N8nExtraNationalityDto; // Optional for Saudi visas
  family?: N8nFamilyDto; // Optional for Korean visas
  files: N8nFilesDto;
  // Additional fields for some visa types
  idNumber?: string;
  crime?: string;
  religion?: string;
  military?: N8nMilitaryDto;
  pastTravels?: N8nPastTravelsDto;
  // Korean visa specific fields
  visited?: boolean;
  cityOfBirth?: string;
  lastTravel?: N8nLastTravelDto;
  // Saudi visa specific fields
  maritalStatus?: string;
  guardianPassport?: string;
}

export class N8nClientDto {
  name: string;
  email: string;
  phone: N8nPhoneDto;
  whatsappAlertsEnabled?: boolean; // Optional for Morocco visas
}

export class N8nEntryDto {
  date: string;
  port: string | null;
}

export class N8nMetaDto {
  url: string;
  branch: string;
  domain: string;
  referrer: string;
  step: number;
  completion: number;
  resumed: boolean;
  timestamp: number;
  clientIp: string;
  revision: number;
}

export class N8nProductVariationDto {
  type: string;
  limit?: number;
  validity?: string;
  dependency: string;
  nationalities: string[];
  name: string;
}

export class N8nProductDto {
  name: string;
  country: string;
  docType: string;
  docName: string;
  intent: string;
  entries: string;
  validity: string;
  valid_since: string;
  wait: number;
  price: Record<string, number>;
  instructions: string[];
  urgencies: Array<{
    speed: string;
    fee: Record<string, number>;
  }>;
  stay_limit: number;
  photo_types: string[];
  calendar_stay_limit?: number; // For Indian visas
  variations?: N8nProductVariationDto[]; // For Korean visas
  replacement?: {
    // For Saudi visas
    active: boolean;
  };
  days_to_use?: number; // For UK ETA
}

export class N8nBusinessDto {
  name: string;
  sector: string;
  website: string;
  address: N8nAddressDto;
  phone: N8nPhoneDto;
}

export class N8nFormDto {
  _id: string;
  id: string;
  applicants: N8nApplicantDto[];
  client: N8nClientDto;
  country: string;
  created_at: string;
  entry: N8nEntryDto;
  fileTransferMethod: string;
  meta: N8nMetaDto;
  orderId: string | null;
  product: N8nProductDto;
  quantity: number;
  termsAgreed: boolean;
  updated_at: string;
  urgency: string;
  business?: N8nBusinessDto; // Optional for business visas
  children?: any[]; // For Korean visas
  stayAddress?: string; // For Korean visas
}

export class N8nOrderDto {
  id: string;
  form_id: string;
  payment_id: string;
  payment_processor: string;
  amount: number;
  currency: string;
  coupon: string | null;
  status: string;
  branch: string;
  domain: string;
}

export class N8nWebhookDto {
  form: N8nFormDto;
  order: N8nOrderDto;
}
