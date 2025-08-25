import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Service responsible for loading and managing workflow schemas
 * Handles schema file loading with fallback to inline definitions
 */
@Injectable()
export class WorkflowSchemaLoaderService {
  private readonly logger = new Logger(WorkflowSchemaLoaderService.name);
  private schemaCache: Map<string, Record<string, unknown>> = new Map();

  /**
   * Load workflow schema from file system or fallback to inline
   */
  loadWorkflowSchema(): Record<string, unknown> {
    const cacheKey = 'workflow-main';

    // Return cached schema if available
    const cachedSchema = this.schemaCache.get(cacheKey);
    if (cachedSchema) {
      return cachedSchema;
    }

    // Try to load from file system
    const schema = this.loadFromFile() || this.getInlineSchema();

    // Cache the loaded schema
    this.schemaCache.set(cacheKey, schema);
    this.logger.log('Workflow schema loaded and cached');

    return schema;
  }

  /**
   * Attempt to load schema from file system
   */
  private loadFromFile(): Record<string, unknown> | null {
    const possiblePaths = [
      join(__dirname, '../schemas/workflow.schema.json'),
      join(__dirname, '../../workflows/schemas/workflow.schema.json'),
      join(
        process.cwd(),
        'apps/backend/src/workflows/schemas/workflow.schema.json',
      ),
    ];

    for (const schemaPath of possiblePaths) {
      if (existsSync(schemaPath)) {
        try {
          const schemaContent = readFileSync(schemaPath, 'utf8');
          this.logger.debug(`Schema loaded from file: ${schemaPath}`);
          return JSON.parse(schemaContent) as Record<string, unknown>;
        } catch (error) {
          this.logger.warn(`Failed to parse schema from ${schemaPath}:`, error);
        }
      }
    }

    this.logger.debug('No schema file found, using inline schema');
    return null;
  }

  /**
   * Get inline workflow schema definition
   */
  private getInlineSchema(): Record<string, unknown> {
    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: 'Workflow Schema',
      description: 'Schema for validating workflow definitions',
      required: ['name', 'triggers', 'steps', 'enabled'],
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          description: 'Unique identifier for the workflow',
        },
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          description: 'Human-readable name for the workflow',
        },
        description: {
          type: 'string',
          maxLength: 500,
          description: 'Optional description of the workflow',
        },
        enabled: {
          type: 'boolean',
          description: 'Whether the workflow is active',
        },
        variables: {
          type: 'object',
          additionalProperties: true,
          description: 'Global variables available to all steps',
        },
        triggers: {
          type: 'array',
          minItems: 1,
          items: { $ref: '#/definitions/trigger' },
          description: 'Array of trigger configurations',
        },
        steps: {
          type: 'array',
          minItems: 1,
          items: { $ref: '#/definitions/step' },
          description: 'Array of workflow steps',
        },
      },
      definitions: this.getSchemaDefinitions(),
    };
  }

  /**
   * Get schema definitions for triggers and steps
   */
  private getSchemaDefinitions(): Record<string, unknown> {
    return {
      trigger: {
        type: 'object',
        required: ['type', 'config'],
        properties: {
          type: {
            type: 'string',
            enum: ['webhook', 'cron', 'manual'],
            description: 'Type of trigger',
          },
          config: {
            type: 'object',
            properties: {
              schedule: {
                type: 'string',
                description: 'Cron expression for scheduling',
              },
              timezone: {
                type: 'string',
                description: 'Timezone for cron execution',
              },
              endpoint: {
                type: 'string',
                description: 'Webhook endpoint identifier',
              },
            },
            additionalProperties: true,
          },
        },
      },
      step: {
        type: 'object',
        required: ['id', 'type', 'config'],
        properties: {
          id: {
            type: 'string',
            pattern: '^[a-zA-Z0-9_-]+$',
            minLength: 1,
            maxLength: 50,
            description: 'Unique identifier for the step within the workflow',
          },
          type: {
            type: 'string',
            enum: ['slack.send', 'whatsapp.send', 'pdf.generate', 'email.send'],
            description: 'Type of action to perform',
          },
          config: {
            type: 'object',
            properties: {
              channel: {
                type: 'string',
                description: 'Slack channel identifier',
              },
              message: {
                type: 'string',
                description: 'Message content',
              },
              template: {
                type: 'string',
                description: 'Template identifier for message',
              },
              contact: {
                type: 'string',
                pattern: '^\\+[1-9]\\d{1,14}$',
                description: 'WhatsApp contact number in E.164 format',
              },
              variables: {
                type: 'object',
                additionalProperties: true,
                description: 'Template variables',
              },
              data: {
                type: 'object',
                additionalProperties: true,
                description: 'Data for PDF generation',
              },
              recipient: {
                type: 'string',
                format: 'email',
                description: 'Email recipient',
              },
              subject: {
                type: 'string',
                description: 'Email subject',
              },
            },
            additionalProperties: true,
          },
          retries: {
            type: 'integer',
            minimum: 0,
            maximum: 10,
            default: 3,
            description: 'Number of retry attempts',
          },
          timeout: {
            type: 'integer',
            minimum: 1000,
            maximum: 300000,
            default: 30000,
            description: 'Step timeout in milliseconds',
          },
        },
      },
    };
  }

  /**
   * Clear the schema cache (useful for testing or reloading)
   */
  clearCache(): void {
    this.schemaCache.clear();
    this.logger.debug('Schema cache cleared');
  }
}
