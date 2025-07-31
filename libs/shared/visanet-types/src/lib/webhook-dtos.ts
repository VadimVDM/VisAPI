import {
  IsString,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEmail,
  IsObject,
  IsDateString,
  IsUrl,
  ValidateIf,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  VisaForm,
  Order,
  ExtraNationality,
  Occupation,
  Product,
  Client,
  Phone,
  Address,
  Family,
  Military,
  PastTravels,
  Marital,
  Entry,
  EmergencyContact,
  AccompanyingChild,
  Passport,
  ApplicantFiles,
  Discount,
  Urgency,
  CountryKey,
  BranchCode,
  Domain,
  CountryIso,
  FileTransferMethod,
  Religion,
  OccupationStatus,
  MaritalStatus,
  PastVisit,
  SaarcVisit,
  Crossing,
  FamilyMember,
  Sex,
  Education,
  JobSeniority,
  MilitaryRole,
  MilitaryRank,
  DateISO,
  ApplicantPhotoType,
  NationalityAcquiredBy,
  LastTravel,
  PaymentProcessor,
} from './types';
import { ORDER_STATUSES } from './constants';

// Phone DTO
export class PhoneDto implements Phone {
  @IsString()
  code!: string;

  @IsString()
  number!: string;
}

// Address DTO
export class AddressDto implements Address {
  @IsString()
  line!: string;

  @IsString()
  city!: string;

  @IsString()
  country!: CountryIso;

  @IsOptional()
  @IsNumber()
  setBy?: number;

  @IsOptional()
  @IsString()
  postalCode?: string;
}

// Client DTO
export class ClientDto implements Client {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @ValidateNested()
  @Type(() => PhoneDto)
  phone!: PhoneDto;

  @IsBoolean()
  whatsappAlertsEnabled!: boolean;
}

// Family Member DTO
export class FamilyMemberDto implements FamilyMember {
  @IsString()
  name!: string;

  @IsString()
  countryOfBirth!: CountryIso;
}

// Marital DTO
export class MaritalDto implements Marital {
  @IsString()
  @IsIn(['single', 'married', 'divorced', 'widowed'])
  status!: MaritalStatus;

  @ValidateNested()
  @Type(() => FamilyMemberDto)
  spouse!: FamilyMemberDto;
}

// Family DTO
export class FamilyDto implements Family {
  @ValidateNested()
  @Type(() => FamilyMemberDto)
  father!: FamilyMemberDto;

  @ValidateNested()
  @Type(() => FamilyMemberDto)
  mother!: FamilyMemberDto;

  @ValidateNested()
  @Type(() => MaritalDto)
  marital!: MaritalDto;
}

// Occupation DTO
export class OccupationDto implements Occupation {
  @IsString()
  @IsIn(['highschool', 'professional', 'academic', 'other'])
  education!: Education;

  @IsString()
  @IsIn([
    'employee',
    'self_employed',
    'retired',
    'unemployed',
    'student',
    'underage',
  ])
  status!: OccupationStatus;

  @IsString()
  name!: string;

  @IsString()
  @IsIn(['0-1', '2-5', '6-10', '11-19', '20+'])
  seniority!: JobSeniority;

  @ValidateNested()
  @Type(() => PhoneDto)
  phone!: PhoneDto;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
}

// Military DTO
export class MilitaryDto implements Military {
  @IsBoolean()
  served!: boolean;

  @IsString()
  @IsIn(['fighter', 'support', 'office'])
  role!: MilitaryRole;

  @IsString()
  @IsIn([
    'private',
    'corporal',
    'sergeant',
    'staff_sergeant',
    'nco',
    'officer',
    'other',
  ])
  rank!: MilitaryRank;
}

// Past Visit DTO
export class PastVisitDto implements PastVisit {
  @IsBoolean()
  visited!: boolean;

  @IsObject()
  @ValidateNested()
  @Type(() => PastVisaDto)
  pastVisa!: {
    number: string;
    dateOfIssue: DateISO;
  };
}

class PastVisaDto {
  @IsString()
  number!: string;

  @IsDateString()
  dateOfIssue!: DateISO;
}

// SAARC Visit DTO
export class SaarcVisitDto implements SaarcVisit {
  @IsBoolean()
  visited!: boolean;

  @IsArray()
  @IsString({ each: true })
  countries!: CountryIso[];

  @IsNumber()
  year!: number;
}

// Past Travels DTO
export class PastTravelsDto implements PastTravels {
  @ValidateNested()
  @Type(() => PastVisitDto)
  pastVisit!: PastVisitDto;

  @IsString()
  rejection!: string;

  @ValidateNested()
  @Type(() => SaarcVisitDto)
  SAARC!: SaarcVisitDto;
}

// Extra Nationality DTOs (using discriminated unions)
export class ExtraNationalityNoneDto {
  @IsEnum(['none'])
  status!: 'none';
}

export class ExtraNationalityPastDto {
  @IsEnum(['past'])
  status!: 'past';

  @IsString()
  country!: CountryIso;

  @IsOptional()
  @IsDateString()
  from?: DateISO;

  @IsDateString()
  until!: DateISO;

  @IsOptional()
  @IsString()
  @IsIn(['birth', 'parents', 'naturalization'])
  acquiry?: NationalityAcquiredBy;
}

export class ExtraNationalityPresentDto {
  @IsEnum(['present'])
  status!: 'present';

  @IsString()
  country!: CountryIso;

  @IsOptional()
  @IsDateString()
  from?: DateISO;

  @IsOptional()
  @IsString()
  @IsIn(['birth', 'parents', 'naturalization'])
  acquiry?: NationalityAcquiredBy;
}

// Union type for ExtraNationality
export type ExtraNationalityDto =
  | ExtraNationalityNoneDto
  | ExtraNationalityPastDto
  | ExtraNationalityPresentDto;

// Crossing DTOs
export class CrossingLandDto {
  @IsEnum(['land'])
  type!: 'land';

  @IsString()
  border!: string;
}

export class CrossingSeaDto {
  @IsEnum(['sea'])
  type!: 'sea';

  @IsString()
  ship!: string;
}

export class CrossingAirDto {
  @IsEnum(['air'])
  type!: 'air';

  @IsString()
  flight!: string;
}

export type CrossingDto = CrossingLandDto | CrossingSeaDto | CrossingAirDto;

// Entry DTO
export class EntryDto implements Entry {
  @IsDateString()
  date!: DateISO;

  @IsOptional()
  @IsString()
  port!: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => Object, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: CrossingLandDto, name: 'land' },
        { value: CrossingSeaDto, name: 'sea' },
        { value: CrossingAirDto, name: 'air' },
      ],
    },
  })
  crossing?: CrossingDto;
}

// Emergency Contact DTO
export class EmergencyContactDto implements EmergencyContact {
  @IsString()
  name!: string;

  @ValidateNested()
  @Type(() => PhoneDto)
  phone!: PhoneDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @IsString()
  relation?: string;
}

// Accompanying Child DTO
export class AccompanyingChildDto implements AccompanyingChild {
  @IsString()
  name!: string;

  @IsDateString()
  dateOfBirth!: DateISO;

  @IsString()
  countryOfBirth!: CountryIso;
}

// Passport DTO
export class PassportDto implements Passport {
  @IsString()
  nationality!: CountryIso;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  @IsIn(['m', 'f'])
  sex!: Sex;

  @IsDateString()
  dateOfBirth!: DateISO;

  @IsString()
  countryOfBirth!: CountryIso;

  @IsString()
  number!: string;

  @IsDateString()
  dateOfIssue!: DateISO;

  @IsDateString()
  dateOfExpiry!: DateISO;

  @IsString()
  placeOfIssue!: CountryIso;
}

// Partial Passport DTOs for countries that omit certain fields
export class PassportOmitPlaceOfIssueDto
  implements Omit<Passport, 'placeOfIssue'>
{
  @IsString()
  nationality!: CountryIso;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  @IsIn(['m', 'f'])
  sex!: Sex;

  @IsDateString()
  dateOfBirth!: DateISO;

  @IsString()
  countryOfBirth!: CountryIso;

  @IsString()
  number!: string;

  @IsDateString()
  dateOfIssue!: DateISO;

  @IsDateString()
  dateOfExpiry!: DateISO;
}

// Applicant Files DTO
export class ApplicantFilesDto {
  @IsOptional()
  @IsString()
  face?: string;

  @IsOptional()
  @IsString()
  passport?: string;

  @IsOptional()
  @IsString()
  card?: string;

  @IsOptional()
  @IsString()
  invitation?: string;

  @IsOptional()
  @IsString()
  return_ticket?: string;

  @IsOptional()
  @IsString()
  booking?: string;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsString()
  address_proof?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  travel_ticket?: string;
}

// Last Travel DTO
export class LastTravelDto implements LastTravel {
  @IsBoolean()
  traveled!: boolean;

  @IsString()
  country!: CountryIso;

  @IsDateString()
  from!: DateISO;

  @IsDateString()
  until!: DateISO;
}

// Base Form Meta DTO
export class FormMetaDto {
  @IsUrl()
  url!: string;

  @IsString()
  @IsIn(['se', 'co', 'il', 'ru', 'kz'])
  branch!: BranchCode;

  @IsString()
  domain!: Domain;

  @IsString()
  referrer!: string;

  @IsNumber()
  step!: number;

  @IsNumber()
  completion!: number;

  @IsBoolean()
  resumed!: boolean;

  @IsNumber()
  timestamp!: number;

  @IsString()
  clientIp!: string;

  @IsNumber()
  revision!: number;
}

// Discount DTO
export class DiscountDto implements Discount {
  @IsString()
  coupon!: string;

  @IsNumber()
  percent!: number;
}

// Order DTO
export class OrderDto implements Order {
  @IsString()
  id!: string;

  @IsString()
  form_id!: string;

  @IsString()
  @IsIn(['se', 'co', 'il', 'ru', 'kz'])
  branch!: BranchCode;

  @IsString()
  domain!: Domain;

  @IsString()
  @IsIn(['stripe', 'paypal', 'tbank', 'bill', 'bit', 'paybox'])
  payment_processor!: PaymentProcessor;

  @IsString()
  payment_id!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsObject()
  coupon!: any | null;

  @IsString()
  @IsIn(['active', 'completed', 'issue', 'canceled'])
  status!: (typeof ORDER_STATUSES)[number];
}

// Main Vizi Webhook DTO - More permissive for real webhook data
export class ViziWebhookDto {
  @IsObject()
  form!: Record<string, any>; // Accept any form structure from Visanet

  @ValidateNested()
  @Type(() => OrderDto)
  order!: OrderDto;
}

// Example of a specific form DTO (India)
export class IndiaBusinessDto {
  @IsString()
  name!: string;

  @IsString()
  sector!: string;

  @ValidateNested()
  @Type(() => PhoneDto)
  phone!: PhoneDto;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @IsOptional()
  @IsUrl()
  website?: string;
}

export class IndiaApplicantDto {
  @IsString()
  id!: string;

  @ValidateNested()
  @Type(() => PassportDto)
  passport!: PassportDto;

  @ValidateNested()
  @Type(() => Object, {
    discriminator: {
      property: 'status',
      subTypes: [
        { value: ExtraNationalityNoneDto, name: 'none' },
        { value: ExtraNationalityPastDto, name: 'past' },
        { value: ExtraNationalityPresentDto, name: 'present' },
      ],
    },
  })
  extraNationality!: ExtraNationalityDto;

  @IsString()
  idNumber!: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @IsString()
  @IsIn(['judaism', 'christianity', 'islam', 'hindu', 'other'])
  religion!: Religion;

  @IsString()
  crime!: string;

  @ValidateNested()
  @Type(() => FamilyDto)
  family!: FamilyDto;

  @ValidateNested()
  @Type(() => OccupationDto)
  occupation!: OccupationDto;

  @ValidateNested()
  @Type(() => MilitaryDto)
  military!: MilitaryDto;

  @ValidateNested()
  @Type(() => PastTravelsDto)
  pastTravels!: PastTravelsDto;

  @ValidateNested()
  @Type(() => ApplicantFilesDto)
  files!: ApplicantFilesDto;
}

// Product DTO (simplified for webhook validation)
export class ProductDto {
  @IsString()
  name!: string;

  @IsString()
  country!: CountryKey;

  @IsString()
  docType!: string;

  @IsString()
  docName!: string;

  @IsObject()
  price!: Record<string, number>;

  // Add other necessary fields as needed
}

export class IndiaVisaFormDto {
  @IsString()
  id!: string;

  @IsString()
  @IsEnum(['india'])
  country!: 'india';

  @ValidateNested()
  @Type(() => ClientDto)
  client!: ClientDto;

  @ValidateNested()
  @Type(() => ProductDto)
  product!: ProductDto;

  @IsNumber()
  quantity!: number;

  @IsString()
  urgency!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DiscountDto)
  discount?: DiscountDto;

  @IsBoolean()
  termsAgreed!: boolean;

  @IsOptional()
  @IsString()
  orderId!: string | null;

  @ValidateNested()
  @Type(() => FormMetaDto)
  meta!: FormMetaDto;

  @ValidateNested()
  @Type(() => EntryDto)
  entry!: EntryDto;

  @ValidateNested()
  @Type(() => IndiaBusinessDto)
  business!: IndiaBusinessDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IndiaApplicantDto)
  applicants!: IndiaApplicantDto[];

  @IsString()
  @IsIn(['form', 'email', 'whatsapp', 'later'])
  fileTransferMethod!: FileTransferMethod;
}

// Create form validation factory
export function createFormDtoByCountry(country: CountryKey) {
  // This would return the appropriate DTO class based on country
  // For now, we'll just return a generic object validator
  switch (country) {
    case 'india':
      return IndiaVisaFormDto;
    // Add other countries as needed
    default:
      return Object; // Fallback
  }
}
