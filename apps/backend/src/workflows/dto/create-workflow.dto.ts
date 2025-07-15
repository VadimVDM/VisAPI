import { IsString, IsNotEmpty, IsOptional, IsObject, IsBoolean, IsArray, ValidateNested, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkflowDto {
  @ApiProperty({
    description: 'Human-readable name for the workflow',
    example: 'Daily Visa Status Updates',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Optional description of the workflow',
    example: 'Sends daily WhatsApp updates to visa applicants',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Whether the workflow is active',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: 'Global variables available to all steps',
    example: { timezone: 'UTC', defaultLanguage: 'en' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiProperty({
    description: 'Workflow definition as JSON object',
    example: {
      triggers: [
        {
          type: 'cron',
          config: {
            schedule: '0 9 * * *',
          },
        },
      ],
      steps: [
        {
          id: 'send-update',
          type: 'whatsapp.send',
          config: {
            contact: '+1234567890',
            template: 'visa_status_update',
          },
          retries: 3,
        },
      ],
    },
  })
  @IsObject()
  @IsNotEmpty()
  schema: {
    triggers: Array<{
      type: 'webhook' | 'cron' | 'manual';
      config: Record<string, any>;
    }>;
    steps: Array<{
      id: string;
      type: 'slack.send' | 'whatsapp.send' | 'pdf.generate' | 'email.send';
      config: Record<string, any>;
      retries?: number;
      timeout?: number;
    }>;
  };
}