import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export enum WhatsAppMessageType {
  ORDER_CONFIRMATION = 'order_confirmation',
  VISA_APPROVAL = 'visa_approval',
}

/**
 * DTO for retriggering WhatsApp notifications
 */
export class RetriggerWhatsAppDto {
  @ApiPropertyOptional({
    description: 'Database ID of the order',
    example: 'uuid-here',
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Vizi order ID (order_id field)',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  viziOrderId?: string;

  @ApiPropertyOptional({
    description: 'Client phone number to find the most recent order',
    example: '+972501234567',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Force resend even if already sent',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @ApiPropertyOptional({
    description: 'Type of WhatsApp message to send',
    enum: WhatsAppMessageType,
    default: WhatsAppMessageType.ORDER_CONFIRMATION,
  })
  @IsOptional()
  @IsEnum(WhatsAppMessageType)
  messageType?: WhatsAppMessageType;
}

/**
 * Result of WhatsApp retrigger operation
 */
export class RetriggerWhatsAppResultDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
  })
  success: boolean;

  @ApiProperty({
    description: 'Database ID of the order',
  })
  orderId: string;

  @ApiProperty({
    description: 'Phone number of the client',
  })
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'CBB contact UUID if available',
  })
  cbbContactUuid?: string;

  @ApiProperty({
    description: 'Status message describing the result',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Job ID if message was queued',
  })
  jobId?: string;

  @ApiPropertyOptional({
    description: 'Whether message was already sent',
  })
  alreadySent?: boolean;

  @ApiPropertyOptional({
    description: 'Error message if operation failed',
  })
  error?: string;
}
