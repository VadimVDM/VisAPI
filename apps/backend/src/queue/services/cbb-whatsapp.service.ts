import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { QueueService } from '../queue.service';
import { SupabaseService } from '@visapi/core-supabase';
import { LogService } from '@visapi/backend-logging';
import { JOB_NAMES, QUEUE_NAMES } from '@visapi/shared-types';
import { OrderData } from './cbb-order.types';
import { CBBContactRecord } from '@visapi/backend-queue';

@Injectable()
export class CbbWhatsAppService {
  constructor(
    @InjectPinoLogger(CbbWhatsAppService.name)
    private readonly logger: PinoLogger,
    private readonly queueService: QueueService,
    private readonly supabaseService: SupabaseService,
    private readonly logService: LogService,
  ) {}

  async queueOrderConfirmation(
    order: OrderData,
    contactId: string,
    hasWhatsApp: boolean,
    cbbContact: CBBContactRecord,
  ): Promise<void> {
    const alreadySent = await this.isOrderConfirmationAlreadySent(
      order.order_id,
    );

    this.logger.info(
      `Checking WhatsApp confirmation conditions for order ${order.order_id}:`,
      {
        hasWhatsApp,
        whatsapp_alerts_enabled: order.whatsapp_alerts_enabled,
        cbb_alerts_enabled: cbbContact?.alerts_enabled,
        new_order_notification_sent: cbbContact?.new_order_notification_sent,
        whatsapp_message_already_sent: alreadySent,
        branch: order.branch,
        branch_lowercase: order.branch?.toLowerCase(),
        is_il_branch: order.branch?.toLowerCase() === 'il',
      },
    );

    if (
      !hasWhatsApp ||
      !order.whatsapp_alerts_enabled ||
      order.branch?.toLowerCase() !== 'il' ||
      cbbContact?.alerts_enabled === false ||
      cbbContact?.new_order_notification_sent === true ||
      alreadySent
    ) {
      const reason = this.resolveSkipReason({
        hasWhatsApp,
        order,
        cbbContact,
        alreadySent,
      });
      this.logger.info(
        `WhatsApp notification skipped for order ${order.order_id}: ${reason}`,
      );
      return;
    }

    try {
      const trackingInsert = await this.supabaseService.serviceClient
        .from('whatsapp_messages')
        .insert({
          id: randomUUID(),
          order_id: order.order_id,
          phone_number: order.client_phone,
          template_name: 'order_confirmation_global',
          status: 'queued',
          confirmation_sent: false,
          alerts_enabled: order.whatsapp_alerts_enabled,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (
        trackingInsert.error &&
        !trackingInsert.error.message?.includes('duplicate')
      ) {
        this.logger.warn(
          `Failed to create WhatsApp tracking record for order ${order.order_id}: ${trackingInsert.error.message}`,
        );

        await this.logService.createLog({
          level: 'warn',
          message: `Failed to create WhatsApp tracking record for order ${order.order_id}`,
          metadata: {
            order_id: order.order_id,
            error: trackingInsert.error.message,
            source: 'cbb_sync',
          },
        });
      }

      this.logger.info(
        `Attempting to queue WhatsApp job for order ${order.order_id}`,
        {
          queue_name: QUEUE_NAMES.WHATSAPP_MESSAGES,
          job_name: JOB_NAMES.SEND_WHATSAPP_ORDER_CONFIRMATION,
          contact_id: contactId,
        },
      );

      const job = await this.queueService.addJob(
        QUEUE_NAMES.WHATSAPP_MESSAGES,
        JOB_NAMES.SEND_WHATSAPP_ORDER_CONFIRMATION,
        {
          orderId: order.order_id,
          contactId,
          messageType: 'order_confirmation',
        },
        {
          delay: 1000,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      if (!job) {
        throw new Error('Failed to create WhatsApp job - addJob returned null');
      }

      this.logger.info(
        `Successfully queued WhatsApp order confirmation for ${order.order_id} to contact ${contactId} (job ID: ${job.id})`,
      );

      await this.logService.createLog({
        level: 'info',
        message: `Successfully queued WhatsApp order confirmation`,
        metadata: {
          order_id: order.order_id,
          contact_id: contactId,
          job_id: job.id,
          job_name: JOB_NAMES.SEND_WHATSAPP_ORDER_CONFIRMATION,
          source: 'cbb_sync',
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to queue WhatsApp message for order ${order.order_id}:`,
        error,
      );

      await this.logService.createLog({
        level: 'error',
        message: `Failed to queue WhatsApp message for order ${order.order_id}`,
        metadata: {
          order_id: order.order_id,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          source: 'cbb_sync',
        },
      });
    }
  }

  private resolveSkipReason({
    hasWhatsApp,
    order,
    cbbContact,
    alreadySent,
  }: {
    hasWhatsApp: boolean;
    order: OrderData;
    cbbContact: CBBContactRecord;
    alreadySent: boolean;
  }): string {
    if (!hasWhatsApp) {
      return `Contact doesn't have WhatsApp`;
    }
    if (!order.whatsapp_alerts_enabled) {
      return `WhatsApp alerts disabled on order`;
    }
    if (order.branch?.toLowerCase() !== 'il') {
      return `Non-IL branch (${order.branch})`;
    }
    if (cbbContact?.alerts_enabled === false) {
      return `WhatsApp alerts disabled for CBB contact`;
    }
    if (cbbContact?.new_order_notification_sent === true) {
      return `New order notification already sent (CBB flag)`;
    }
    if (alreadySent) {
      return `New order notification already sent (WhatsApp messages table)`;
    }
    return 'Unknown';
  }

  private async isOrderConfirmationAlreadySent(
    orderId: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabaseService.serviceClient
      .from('whatsapp_messages')
      .select('id')
      .eq('order_id', orderId)
      .eq('template_name', 'order_confirmation_global')
      .eq('confirmation_sent', true)
      .maybeSingle();

    if (error) {
      this.logger.warn(
        `Failed to check WhatsApp history for order ${orderId}: ${error.message}`,
      );
      return false;
    }

    return Boolean(data);
  }
}
