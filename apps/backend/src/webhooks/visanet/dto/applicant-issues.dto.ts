import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsArray,
  IsOptional,
} from 'class-validator';

/**
 * Individual issue item with value and label
 */
export class IssueItemDto {
  @ApiProperty({
    description: 'Issue value/code',
    example: 'with_shadow_light',
  })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({
    description: 'Human-readable issue label',
    example: 'With Shadow/Light',
  })
  @IsString()
  @IsNotEmpty()
  label: string;
}

/**
 * Issues grouped by category
 */
export class IssuesCategoriesDto {
  @ApiProperty({
    description: 'Face photo issues',
    type: [IssueItemDto],
    example: [],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IssueItemDto)
  face_photo?: IssueItemDto[];

  @ApiProperty({
    description: 'Passport photo issues',
    type: [IssueItemDto],
    example: [
      { value: 'with_shadow_light', label: 'With Shadow/Light' },
      { value: 'code_hidden_at_bottom', label: 'Code Hidden at Bottom' },
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IssueItemDto)
  passport_photo?: IssueItemDto[];

  @ApiProperty({
    description: 'Business document issues',
    type: [IssueItemDto],
    example: [],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IssueItemDto)
  business?: IssueItemDto[];

  @ApiProperty({
    description: 'Passport expiry issues',
    type: [IssueItemDto],
    example: [],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IssueItemDto)
  passport_expiry?: IssueItemDto[];

  @ApiProperty({
    description: 'Application details issues',
    type: [IssueItemDto],
    example: [],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IssueItemDto)
  application_details?: IssueItemDto[];
}

/**
 * Applicant Issues Webhook DTO
 * Receives issue reports from Visanet for applicants requiring document fixes
 */
export class ApplicantIssuesWebhookDto {
  @ApiProperty({
    description: 'Applicant ID from Visanet/Airtable',
    example: 'apl_jwGu1dBAxeOc',
  })
  @IsString()
  @IsNotEmpty()
  applicantId: string;

  @ApiProperty({
    description: 'Issues grouped by category',
    type: IssuesCategoriesDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => IssuesCategoriesDto)
  issues: IssuesCategoriesDto;

  @ApiProperty({
    description:
      'Optional phone number override for WhatsApp notification. If provided, sends to this number instead of the number from order/Airtable. Leading + will be automatically removed.',
    example: '+972509477317',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;
}

/**
 * Response DTO for applicant issues webhook
 */
export class ApplicantIssuesResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Issues received and processed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Created applicant issue record ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  issueRecordId?: string;

  @ApiProperty({
    description: 'Processing details',
    required: false,
  })
  details?: {
    applicantId: string;
    applicantName?: string;
    orderId?: string;
    totalIssues: number;
    whatsappSent: boolean;
  };
}
