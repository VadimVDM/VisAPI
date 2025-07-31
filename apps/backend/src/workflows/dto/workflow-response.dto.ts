import { ApiProperty } from '@nestjs/swagger';
import { WorkflowSchema } from '@visapi/shared-types';

export class WorkflowResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the workflow',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Human-readable name for the workflow',
    example: 'Daily Visa Status Updates',
  })
  name: string;

  @ApiProperty({
    description: 'Optional description of the workflow',
    example: 'Sends daily WhatsApp updates to visa applicants',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Whether the workflow is active',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: 'Global variables available to all steps',
    example: { timezone: 'UTC', defaultLanguage: 'en' },
    required: false,
  })
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
  schema: WorkflowSchema;

  @ApiProperty({
    description: 'Workflow creation timestamp',
    example: '2025-07-15T10:30:00Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Workflow last update timestamp',
    example: '2025-07-15T14:45:00Z',
  })
  updated_at: string;
}
