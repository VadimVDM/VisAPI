import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsPhoneNumber } from 'class-validator';

export class ResyncCBBContactDto {
  @ApiProperty({
    description: 'Phone number (CBB ID) of the contact to resync',
    example: '+972501234567',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Order ID (from orders table) to use for resync',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({
    description: 'Vizi Order ID to find the order and resync',
    example: '123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  viziOrderId?: string;
}

export class ResyncCBBResultDto {
  @ApiProperty({
    description: 'Whether the resync was successful',
  })
  success: boolean;

  @ApiProperty({
    description: 'Phone number that was resynced',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Order ID used for resync',
  })
  orderId: string;

  @ApiProperty({
    description: 'CBB contact UUID if created/updated',
    required: false,
  })
  cbbContactUuid?: string;

  @ApiProperty({
    description: 'Result message',
  })
  message: string;

  @ApiProperty({
    description: 'Error details if failed',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'WhatsApp availability status',
    required: false,
  })
  whatsappAvailable?: boolean;

  @ApiProperty({
    description: 'Whether contact was created (true) or updated (false)',
    required: false,
  })
  created?: boolean;
}
