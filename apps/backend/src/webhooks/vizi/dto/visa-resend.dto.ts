import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VisaResendDto {
  @ApiProperty({
    description: 'The order ID to resend visa approval notifications for (e.g., IL250928IN7)',
    example: 'IL250928IN7',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;
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
    example: 'Successfully triggered visa approval resend for order IL250928IN7',
  })
  message: string;

  @ApiProperty({
    description: 'Detailed information about the resend operation',
    required: false,
  })
  details?: {
    applicationsFound: number;
    messagesSent: number;
    visaNotificationReset: boolean;
    expandedData: boolean;
  };
}