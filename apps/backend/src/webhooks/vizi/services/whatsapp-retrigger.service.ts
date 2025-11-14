import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OrdersRepository } from '@visapi/backend-repositories';
import { SupabaseService } from '@visapi/core-supabase';
import { QueueService } from '../../../queue/queue.service';
import { LogService } from '@visapi/backend-logging';
import {
  RetriggerWhatsAppDto,
  RetriggerWhatsAppResultDto,
  WhatsAppMessageType,
} from '../dto/retrigger-whatsapp.dto';
import { JOB_NAMES, QUEUE_NAMES } from '@visapi/shared-types';

@Injectable()
export class ViziWhatsAppRetriggerService {
  private readonly logger = new Logger(ViziWhatsAppRetriggerService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly supabaseService: SupabaseService,
    private readonly queueService: QueueService,
    private readonly logService: LogService,
  ) {}

  async retrigger(
    dto: RetriggerWhatsAppDto,
    correlationId: string,
  ): Promise<RetriggerWhatsAppResultDto> {
    const messageType =
      dto.messageType || WhatsAppMessageType.ORDER_CONFIRMATION;

    this.logger.log(
      `Starting WhatsApp retrigger: phoneNumber=${dto.phoneNumber}, orderId=${dto.orderId}, viziOrderId=${dto.viziOrderId}, messageType=${messageType}, force=${dto.force}, correlationId=${correlationId}`,
    );

    if (!dto.phoneNumber && !dto.orderId && !dto.viziOrderId) {
      throw new BadRequestException(
        'At least one of phoneNumber, orderId, or viziOrderId must be provided',
      );
    }

    await this.logService.createLog({
      level: 'info',
      message: 'WhatsApp retrigger operation initiated',
      metadata: {
        phoneNumber: dto.phoneNumber,
        orderId: dto.orderId,
        viziOrderId: dto.viziOrderId,
        force: dto.force,
        source: 'admin_retrigger_whatsapp',
      },
      correlation_id: correlationId,
    });

    try {
      const order = await this.findOrder(dto);
      if (!order) {
        const searchCriteria = dto.orderId
          ? `orderId: ${dto.orderId}`
          : dto.viziOrderId
            ? `viziOrderId: ${dto.viziOrderId}`
            : `phoneNumber: ${dto.phoneNumber}`;

        throw new BadRequestException(`Order not found with ${searchCriteria}`);
      }

      if (order.branch?.toLowerCase() !== 'il') {
        return {
          success: false,
          orderId: order.id,
          phoneNumber: order.client_phone || 'unknown',
          message: `WhatsApp notification skipped - order is for ${order.branch} branch (only IL branch orders can send WhatsApp)`,
        };
      }

      if (!dto.force && !order.whatsapp_alerts_enabled) {
        return {
          success: false,
          orderId: order.id,
          phoneNumber: order.client_phone || 'unknown',
          message:
            'WhatsApp alerts are disabled for this order. Use force=true to override.',
        };
      }

      if (!order.cbb_contact_uuid) {
        return {
          success: false,
          orderId: order.id,
          phoneNumber: order.client_phone || 'unknown',
          message:
            'Order has not been synced with CBB yet. Please run CBB resync first.',
        };
      }

      const { data: cbbContact, error: cbbError } =
        await this.supabaseService.serviceClient
          .from('cbb_contacts')
          .select('*')
          .eq('id', order.cbb_contact_uuid)
          .single();

      if (cbbError || !cbbContact) {
        return {
          success: false,
          orderId: order.id,
          phoneNumber: order.client_phone || 'unknown',
          message: 'CBB contact not found in database',
          error: cbbError?.message,
        };
      }

      if (!dto.force) {
        if (messageType === WhatsAppMessageType.ORDER_CONFIRMATION) {
          const { data: existingMessage } =
            await this.supabaseService.serviceClient
              .from('whatsapp_messages')
              .select('id, confirmation_sent, status')
              .eq('order_id', order.order_id)
              .eq('template_name', 'order_confirmation_global')
              .maybeSingle();

          if (
            existingMessage?.confirmation_sent ||
            existingMessage?.status === 'delivered'
          ) {
            return {
              success: false,
              orderId: order.id,
              phoneNumber: order.client_phone || 'unknown',
              cbbContactUuid: order.cbb_contact_uuid,
              message:
                'WhatsApp order confirmation already sent. Use force=true to resend.',
              alreadySent: true,
            };
          }

          if (cbbContact.new_order_notification_sent) {
            return {
              success: false,
              orderId: order.id,
              phoneNumber: order.client_phone || 'unknown',
              cbbContactUuid: order.cbb_contact_uuid,
              message:
                'WhatsApp order confirmation already sent (CBB flag). Use force=true to resend.',
              alreadySent: true,
            };
          }
        } else if (messageType === WhatsAppMessageType.VISA_APPROVAL) {
          // Check if visa approval was already sent
          if (order.visa_notification_sent) {
            return {
              success: false,
              orderId: order.id,
              phoneNumber: order.client_phone || 'unknown',
              cbbContactUuid: order.cbb_contact_uuid,
              message:
                'Visa approval notification already sent. Use force=true to resend.',
              alreadySent: true,
            };
          }

          // Check if visa details exist
          if (!order.visa_details) {
            return {
              success: false,
              orderId: order.id,
              phoneNumber: order.client_phone || 'unknown',
              cbbContactUuid: order.cbb_contact_uuid,
              message:
                'No visa details found for this order. Please fetch from Airtable first.',
            };
          }
        }
      }

      // Queue different job based on message type
      if (messageType === WhatsAppMessageType.VISA_APPROVAL) {
        // Handle visa approval messages
        interface VisaDetailsType {
          applications?: Array<{
            visaUrl: string;
            country?: string;
            applicantName?: string;
          }>;
        }
        const visaDetails = order.visa_details as VisaDetailsType;
        if (!visaDetails?.applications?.length) {
          return {
            success: false,
            orderId: order.id,
            phoneNumber: order.client_phone || 'unknown',
            message: 'No visa applications found in order details',
          };
        }

        // Support up to 10 applications
        const maxApplications = Math.min(visaDetails.applications.length, 10);
        const jobIds: string[] = [];

        for (let i = 0; i < maxApplications; i++) {
          const application = visaDetails.applications[i];
          const isFirstMessage = i === 0;
          const delayMs = isFirstMessage ? 0 : i * 5000; // 5 seconds between messages

          let templateName: string;
          let templateParams: string[];

          if (isFirstMessage) {
            // First message uses the phone template with name and country
            templateName = 'visa_approval_file_phone';
            const nameHebrew =
              cbbContact.client_name || order.client_name || 'לקוח יקר';
            const country =
              application.country || order.product_country || 'המדינה המבוקשת';
            templateParams = [nameHebrew, country];
          } else {
            // Subsequent messages use the multi template with just the applicant name
            // Template only supports 1 parameter (applicant name)
            templateName = 'visa_approval_file_multi_he';
            templateParams = [
              application.applicantName || `Applicant ${i + 1}`,
            ];
          }

          const job = await this.queueService.addJob(
            QUEUE_NAMES.WHATSAPP_MESSAGES,
            JOB_NAMES.SEND_WHATSAPP_VISA_APPROVAL,
            {
              orderId: order.order_id,
              contactId: cbbContact.cbb_contact_id,
              messageType: 'visa_approval' as const,
              cbbId: cbbContact.cbb_contact_id,
              phone: cbbContact.client_phone,
              templateName,
              templateParams,
              documentUrl: application.visaUrl,
              visaDetails,
              applicationIndex: i,
              totalApplications: maxApplications,
            },
            {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
              delay: delayMs,
              removeOnComplete: true,
              removeOnFail: false,
            },
          );

          jobIds.push(String(job.id));

          this.logger.debug(
            `Queued visa notification ${i + 1}/${maxApplications} for ${order.order_id} with ${delayMs}ms delay`,
          );
        }

        this.logger.log(
          `${maxApplications} visa approval messages queued for order ${order.order_id}`,
        );

        await this.logService.createLog({
          level: 'info',
          message: 'Visa approval notifications successfully queued',
          metadata: {
            order_id: order.order_id,
            database_id: order.id,
            cbb_contact_id: cbbContact.cbb_contact_id,
            job_ids: jobIds,
            total_applications: maxApplications,
            force: dto.force,
            source: 'admin_retrigger_whatsapp_visa',
          },
          correlation_id: correlationId,
        });

        return {
          success: true,
          orderId: order.id,
          phoneNumber: order.client_phone || 'unknown',
          cbbContactUuid: order.cbb_contact_uuid,
          message: `${maxApplications} visa approval notifications queued successfully`,
          jobId: jobIds.join(', '),
        };
      } else {
        // Original order confirmation logic
        const job = await this.queueService.addJob(
          QUEUE_NAMES.WHATSAPP_MESSAGES,
          JOB_NAMES.SEND_WHATSAPP_ORDER_CONFIRMATION,
          {
            orderId: order.order_id,
            contactId: cbbContact.cbb_contact_id,
            messageType: 'order_confirmation',
          },
          {
            delay: 1000,
            attempts: 3,
            removeOnComplete: true,
            removeOnFail: false,
            backoff: {
              type: 'exponential',
              delay: 10000,
            },
          },
        );

        this.logger.log(
          `WhatsApp order confirmation queued for order ${order.order_id} (job ID: ${job.id})`,
        );

        await this.logService.createLog({
          level: 'info',
          message: 'WhatsApp order confirmation successfully queued',
          metadata: {
            order_id: order.order_id,
            database_id: order.id,
            cbb_contact_id: cbbContact.cbb_contact_id,
            job_id: job.id,
            force: dto.force,
            source: 'admin_retrigger_whatsapp',
          },
          correlation_id: correlationId,
        });

        return {
          success: true,
          orderId: order.id,
          phoneNumber: order.client_phone || 'unknown',
          cbbContactUuid: order.cbb_contact_uuid,
          message: `WhatsApp order confirmation queued successfully (Job ID: ${job.id})`,
          jobId: job.id,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `WhatsApp retrigger operation failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.logService.createLog({
        level: 'error',
        message: 'WhatsApp retrigger operation failed',
        metadata: {
          error: errorMessage,
          phoneNumber: dto.phoneNumber,
          orderId: dto.orderId,
          viziOrderId: dto.viziOrderId,
          source: 'admin_retrigger_whatsapp',
        },
        correlation_id: correlationId,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      return {
        success: false,
        phoneNumber: dto.phoneNumber || 'unknown',
        orderId: dto.orderId || 'unknown',
        message: 'WhatsApp retrigger failed',
        error: errorMessage,
      };
    }
  }

  private async findOrder(dto: RetriggerWhatsAppDto) {
    if (dto.orderId) {
      const orders = await this.ordersRepository.findMany({
        where: { order_id: dto.orderId },
      });

      if (orders?.[0]) {
        return orders[0];
      }

      if (
        dto.orderId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        )
      ) {
        return this.ordersRepository.findById(dto.orderId);
      }
    }

    if (dto.viziOrderId) {
      const orders = await this.ordersRepository.findMany({
        where: { order_id: dto.viziOrderId },
      });
      return orders?.[0];
    }

    if (dto.phoneNumber) {
      const orders = await this.ordersRepository.findMany({
        where: { client_phone: dto.phoneNumber },
        orderBy: 'created_at',
        orderDirection: 'desc',
      });
      return orders?.[0];
    }

    return undefined;
  }
}
