import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  ValidateNested,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

export class N8nPassportDto {
  @IsOptional()
  @IsString()
  nationality?: string; // Optional for UK ETA

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  sex?: string; // Optional for UK ETA

  @IsOptional()
  @IsString()
  dateOfBirth?: string; // Optional for UK ETA

  @IsOptional()
  @IsString()
  countryOfBirth?: string; // Optional for UK ETA

  @IsOptional()
  @IsString()
  number?: string; // Optional for UK ETA

  @IsOptional()
  @IsString()
  dateOfIssue?: string; // Optional for UK ETA

  @IsOptional()
  @IsString()
  dateOfExpiry?: string; // Optional for UK ETA

  @IsOptional()
  @IsString()
  placeOfIssue?: string; // Optional for some visa types
}

export class N8nPastVisitDto {
  @IsBoolean()
  visited: boolean;

  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsObject()
  pastVisa?: {
    number: string;
    dateOfIssue: string;
  };
}

export class N8nAddressDto {
  @IsString()
  line: string;

  @IsString()
  city: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsNumber()
  setBy?: number; // Optional for UK ETA
}

export class N8nPhoneDto {
  @IsString()
  code: string;

  @IsString()
  number: string;
}

export class N8nOccupationDto {
  @IsString()
  education: string;

  @IsString()
  status: string;

  @IsString()
  name: string;

  @IsString()
  seniority: string;

  @ValidateNested()
  @Type(() => N8nPhoneDto)
  phone: N8nPhoneDto;

  @ValidateNested()
  @Type(() => N8nAddressDto)
  address: N8nAddressDto;
}

export class N8nExtraNationalityDto {
  @IsString()
  status: string;
}

export class N8nFamilyParentDto {
  @IsString()
  name: string;

  @IsString()
  countryOfBirth: string;
}

export class N8nFamilySpouseDto {
  @IsString()
  name: string;

  @IsString()
  countryOfBirth: string;
}

export class N8nFamilyMaritalDto {
  @IsString()
  status: string;

  @ValidateNested()
  @Type(() => N8nFamilySpouseDto)
  spouse: N8nFamilySpouseDto;
}

export class N8nFamilyDto {
  @ValidateNested()
  @Type(() => N8nFamilyParentDto)
  father: N8nFamilyParentDto;

  @ValidateNested()
  @Type(() => N8nFamilyParentDto)
  mother: N8nFamilyParentDto;

  @ValidateNested()
  @Type(() => N8nFamilyMaritalDto)
  marital: N8nFamilyMaritalDto;
}

export class N8nFilesDto {
  @IsString()
  face: string;

  @IsString()
  passport: string;

  @IsString()
  card: string;

  @IsString()
  invitation: string;

  @IsString()
  return_ticket: string;

  @IsString()
  booking: string;

  @IsString()
  bank: string;

  @IsString()
  address_proof: string;

  @IsString()
  occupation: string;

  @IsString()
  travel_ticket: string;
}

export class N8nMilitaryDto {
  @IsBoolean()
  served: boolean;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  rank?: string;
}

export class N8nPastTravelsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => N8nPastVisitDto)
  pastVisit?: N8nPastVisitDto;

  @IsOptional()
  @IsString()
  rejection?: string;

  @IsOptional()
  @IsObject()
  SAARC?: {
    visited: boolean;
    countries: string[];
    year: number;
  };
}

export class N8nLastTravelDto {
  @IsBoolean()
  traveled: boolean;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  until?: string;
}

export class N8nApplicantDto {
  @IsString()
  id: string;

  @ValidateNested()
  @Type(() => N8nPassportDto)
  passport: N8nPassportDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => N8nPastVisitDto)
  pastVisit?: N8nPastVisitDto; // Optional for backward compatibility

  @IsOptional()
  @ValidateNested()
  @Type(() => N8nAddressDto)
  address?: N8nAddressDto; // Optional for Morocco visas

  @ValidateNested()
  @Type(() => N8nOccupationDto)
  occupation: N8nOccupationDto | string; // Can be object or simple string (Saudi/Morocco visas)

  @IsOptional()
  @ValidateNested()
  @Type(() => N8nExtraNationalityDto)
  extraNationality?: N8nExtraNationalityDto; // Optional for Saudi visas

  @IsOptional()
  @ValidateNested()
  @Type(() => N8nFamilyDto)
  family?: N8nFamilyDto; // Optional for Korean visas

  @ValidateNested()
  @Type(() => N8nFilesDto)
  files: N8nFilesDto;

  // Additional fields for some visa types
  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsString()
  crime?: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => N8nMilitaryDto)
  military?: N8nMilitaryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => N8nPastTravelsDto)
  pastTravels?: N8nPastTravelsDto;

  // Korean visa specific fields
  @IsOptional()
  @IsBoolean()
  visited?: boolean;

  @IsOptional()
  @IsString()
  cityOfBirth?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => N8nLastTravelDto)
  lastTravel?: N8nLastTravelDto;

  // Saudi visa specific fields
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  guardianPassport?: string;
}

export class N8nClientDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @ValidateNested()
  @Type(() => N8nPhoneDto)
  phone: N8nPhoneDto;

  @IsOptional()
  @IsBoolean()
  whatsappAlertsEnabled?: boolean; // Optional for Morocco visas
}

export class N8nEntryDto {
  @IsString()
  date: string;

  port: string | null;
}

export class N8nMetaDto {
  @IsString()
  url: string;

  @IsString()
  branch: string;

  @IsString()
  domain: string;

  @IsString()
  referrer: string;

  @IsNumber()
  step: number;

  @IsNumber()
  completion: number;

  @IsBoolean()
  resumed: boolean;

  @IsNumber()
  timestamp: number;

  @IsString()
  clientIp: string;

  @IsNumber()
  revision: number;
}

export class N8nProductVariationDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  validity?: string;

  @IsString()
  dependency: string;

  @IsArray()
  @IsString({ each: true })
  nationalities: string[];

  @IsString()
  name: string;
}

export class N8nProductDto {
  @IsString()
  name: string;

  @IsString()
  country: string;

  @IsString()
  docType: string;

  @IsString()
  docName: string;

  @IsString()
  intent: string;

  @IsString()
  entries: string;

  @IsString()
  validity: string;

  @IsString()
  valid_since: string;

  @IsNumber()
  wait: number;

  @IsObject()
  price: Record<string, number>;

  @IsArray()
  @IsString({ each: true })
  instructions: string[];

  @IsArray()
  urgencies: Array<{
    speed: string;
    fee: Record<string, number>;
  }>;

  @IsNumber()
  stay_limit: number;

  @IsArray()
  @IsString({ each: true })
  photo_types: string[];

  @IsOptional()
  @IsNumber()
  calendar_stay_limit?: number; // For Indian visas

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => N8nProductVariationDto)
  variations?: N8nProductVariationDto[]; // For Korean visas

  @IsOptional()
  @IsObject()
  replacement?: {
    // For Saudi visas
    active: boolean;
  };

  @IsOptional()
  @IsNumber()
  days_to_use?: number; // For UK ETA
}

export class N8nBusinessDto {
  @IsString()
  name: string;

  @IsString()
  sector: string;

  @IsString()
  website: string;

  @ValidateNested()
  @Type(() => N8nAddressDto)
  address: N8nAddressDto;

  @ValidateNested()
  @Type(() => N8nPhoneDto)
  phone: N8nPhoneDto;
}

export class N8nFormDto {
  @IsString()
  _id: string;

  @IsString()
  id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => N8nApplicantDto)
  applicants: N8nApplicantDto[];

  @ValidateNested()
  @Type(() => N8nClientDto)
  client: N8nClientDto;

  @IsString()
  country: string;

  @IsString()
  created_at: string;

  @ValidateNested()
  @Type(() => N8nEntryDto)
  entry: N8nEntryDto;

  @IsString()
  fileTransferMethod: string;

  @ValidateNested()
  @Type(() => N8nMetaDto)
  meta: N8nMetaDto;

  orderId: string | null;

  @ValidateNested()
  @Type(() => N8nProductDto)
  product: N8nProductDto;

  @IsNumber()
  quantity: number;

  @IsBoolean()
  termsAgreed: boolean;

  @IsString()
  updated_at: string;

  @IsString()
  urgency: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => N8nBusinessDto)
  business?: N8nBusinessDto; // Optional for business visas

  @IsOptional()
  @IsArray()
  children?: unknown[]; // For Korean visas

  @IsOptional()
  @IsString()
  stayAddress?: string; // For Korean visas
}

export class N8nOrderDto {
  @IsString()
  id: string;

  @IsString()
  form_id: string;

  @IsString()
  payment_id: string;

  @IsString()
  payment_processor: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  coupon: string | null;

  @IsString()
  status: string;

  @IsString()
  branch: string;

  @IsString()
  domain: string;
}

export class N8nWebhookDto {
  @ValidateNested()
  @Type(() => N8nFormDto)
  form: N8nFormDto;

  @ValidateNested()
  @Type(() => N8nOrderDto)
  order: N8nOrderDto;
}
