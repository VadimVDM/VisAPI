import { Injectable, Logger } from '@nestjs/common';
import { Database } from '@visapi/shared-types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@visapi/core-config';

interface MessageIdUpdateResult {
  success: boolean;
  previousMessageId?: string;
  newMessageId: string;
  updatedAt?: string;
  error?: string;
}

interface CorrelationData {
  orderId?: string;
  contactId?: string;
  messageType?: string;
  tempMessageId?: string;
}

@Injectable()
export class MessageIdUpdaterService {
  private readonly logger = new Logger(MessageIdUpdaterService.name);
  private supabase: SupabaseClient<any>;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get('SUPABASE_URL')!,
      this.configService.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }

  /**
   * Parse correlation data from CBB's biz_opaque_callback_data
   * CBB sends: {"c":"972535777550"} where "c" is the contact phone number
   * This is the ONLY format we support - CBB does not pass through custom correlation data
   */
  parseCorrelationData(bizOpaqueCallbackData: string): CorrelationData | null {
    try {
      if (!bizOpaqueCallbackData) return null;

      // Parse CBB's JSON format: {"c":"972535777550"}
      const parsed = JSON.parse(bizOpaqueCallbackData);

      if (parsed.c) {
        return { contactId: parsed.c };
      }

      this.logger.warn(
        `Unexpected correlation data format: ${bizOpaqueCallbackData}`,
      );
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to parse CBB correlation data: ${bizOpaqueCallbackData}`,
        error,
      );
      return null;
    }
  }

  /**
   * Create correlation data string for biz_opaque_callback_data
   * NOTE: CBB ignores this and sends its own format, but we still include it
   * for potential future use or debugging
   */
  createCorrelationData(
    orderId: string,
    contactId: string,
    messageType: string,
    tempMessageId: string,
  ): string {
    // CBB will ignore this, but we send it anyway for logging/debugging
    return `${orderId}:${contactId}:${messageType}:${tempMessageId}`;
  }

  /**
   * Update message ID when Meta webhook arrives with real WAMID
   */
  async updateMessageId(
    realMessageId: string,
    correlationData: CorrelationData,
  ): Promise<MessageIdUpdateResult> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!realMessageId || !realMessageId.startsWith('wamid.')) {
        return {
          success: false,
          newMessageId: realMessageId,
          error: 'Invalid Meta message ID format',
        };
      }

      // CBB only provides phone number in correlation data
      // Find the most recent message sent to this phone number with a temp ID
      // Use 5-minute time window to avoid matching old messages
      if (!correlationData.contactId) {
        return {
          success: false,
          newMessageId: realMessageId,
          error: 'No contact ID in correlation data',
        };
      }

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      let query = this.supabase
        .from('whatsapp_messages')
        .select('message_id, order_id, phone_number, created_at')
        .eq('phone_number', correlationData.contactId)
        .like('message_id', 'temp_%')
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: existingMessages, error: fetchError } = await query;

      if (fetchError) {
        this.logger.error('Failed to fetch existing message', fetchError);
        return {
          success: false,
          newMessageId: realMessageId,
          error: `Database fetch error: ${fetchError.message}`,
        };
      }

      if (!existingMessages || existingMessages.length === 0) {
        this.logger.warn(
          `No message found for correlation data: ${JSON.stringify(correlationData)}`,
        );
        return {
          success: false,
          newMessageId: realMessageId,
          error: 'No matching message found',
        };
      }

      const messageToUpdate = existingMessages[0];
      const previousMessageId = (messageToUpdate as any).message_id;

      // Check if already updated (idempotency)
      if (previousMessageId === realMessageId) {
        this.logger.debug(`Message ID already updated for ${realMessageId}`);
        return {
          success: true,
          previousMessageId,
          newMessageId: realMessageId,
          updatedAt: new Date().toISOString(),
        };
      }

      // Check if it's a temporary ID
      if (!previousMessageId.startsWith('temp_')) {
        this.logger.warn(
          `Message ID is not temporary: ${previousMessageId}, skipping update`,
        );
        return {
          success: false,
          previousMessageId,
          newMessageId: realMessageId,
          error: 'Message ID is not temporary',
        };
      }

      // Update the message ID
      const { error: updateError } = await this.supabase
        .from('whatsapp_messages')
        .update({
          message_id: realMessageId,
          meta_message_id: realMessageId,
          updated_at: new Date().toISOString(),
        })
        .eq('message_id', previousMessageId);

      if (updateError) {
        this.logger.error('Failed to update message ID', updateError);
        return {
          success: false,
          previousMessageId,
          newMessageId: realMessageId,
          error: `Update error: ${updateError.message}`,
        };
      }

      // Log success with timing
      const duration = Date.now() - startTime;
      this.logger.log(
        `Successfully updated message ID from ${previousMessageId} to ${realMessageId} (${duration}ms)`,
      );

      // Store audit trail
      await this.storeUpdateAudit(
        previousMessageId,
        realMessageId,
        correlationData,
        duration,
      );

      return {
        success: true,
        previousMessageId,
        newMessageId: realMessageId,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Unexpected error updating message ID', error);
      return {
        success: false,
        newMessageId: realMessageId,
        error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Store audit trail for message ID updates
   */
  private async storeUpdateAudit(
    previousId: string,
    newId: string,
    correlationData: CorrelationData,
    durationMs: number,
  ): Promise<void> {
    try {
      await this.supabase.from('logs').insert({
        level: 'info',
        message: 'WhatsApp message ID updated',
        metadata: {
          action: 'message_id_update',
          previous_message_id: previousId,
          new_message_id: newId,
          correlation_data: correlationData as any,
          duration_ms: durationMs,
          timestamp: new Date().toISOString(),
        } as any,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      this.logger.warn('Failed to store message ID update audit', error);
    }
  }

  /**
   * Batch update multiple message IDs (for processing webhook batches)
   */
  async batchUpdateMessageIds(
    updates: Array<{
      realMessageId: string;
      correlationData: CorrelationData;
    }>,
  ): Promise<MessageIdUpdateResult[]> {
    const results: MessageIdUpdateResult[] = [];

    for (const update of updates) {
      const result = await this.updateMessageId(
        update.realMessageId,
        update.correlationData,
      );
      results.push(result);

      // Add small delay to prevent overwhelming the database
      if (updates.length > 10) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    this.logger.log(
      `Batch update completed: ${successCount}/${updates.length} successful`,
    );

    return results;
  }
}
