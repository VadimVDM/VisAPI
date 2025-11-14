import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class VisaResendDto {
  @ApiProperty({
    description:
      'The order ID to resend visa approval notifications for (e.g., IL250928IN7)',
    example: 'IL250928IN7',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    description:
      "Optional phone number to override recipient (e.g., 972507758758). If provided, messages will be sent to this number instead of the order's phone.",
    example: '972507758758',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description:
      'Optional array of Application IDs to resend. If not provided, ALL applications will be resent (default behavior). Application IDs come from Airtable Applications table (e.g., "27H8Q49T88908986").',
    example: ['27H8Q49T88908986', 'E250923ISR4185144524'],
    required: false,
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'applicationIds must contain at least one ID if provided',
  })
  @IsString({ each: true })
  @IsOptional()
  applicationIds?: string[];
}

export class VisaResendResultDto {
  @ApiProperty({
    description: 'Whether the resend operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'The order ID that was processed',
    example: 'IL250928IN7',
  })
  orderId: string;

  @ApiProperty({
    description: 'Human-readable message about the operation result',
    example:
      'Successfully triggered visa approval resend for order IL250928IN7',
  })
  message: string;

  @ApiProperty({
    description: 'Detailed information about the resend operation',
    required: false,
  })
  details?: {
    applicationsFound: number;
    applicationsFiltered?: number; // Number of apps after filtering (only present when filtering)
    messagesSent: number;
    filteredApplicationIds?: string[]; // Which applications were sent (only present when filtering)
    skippedApplicationIds?: string[]; // Which applications were skipped (only present when filtering)
    visaNotificationReset: boolean;
    expandedData: boolean;
  };
}
