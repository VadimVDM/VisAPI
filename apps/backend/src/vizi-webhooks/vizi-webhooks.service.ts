import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ViziWebhookDto,
  VisaForm,
  isIndiaVisaForm,
  Coupon,
} from '@visapi/visanet-types';
import { QueueService } from '../queue/queue.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { SupabaseService } from '@visapi/core-supabase';
import { LogService } from '@visapi/backend-logging';
import { v4 as uuidv4 } from 'uuid';
import { RetriggerOrdersDto, RetriggerResultDto, RetriggerMode } from './dto/retrigger-orders.dto';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class ViziWebhooksService {
  private readonly logger = new Logger(ViziWebhooksService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
    private readonly workflowsService: WorkflowsService,
    private readonly supabaseService: SupabaseService,
    private readonly logService: LogService,
    private readonly ordersService: OrdersService,
  ) {}

  async processViziOrder(
    webhookData: ViziWebhookDto,
    correlationId?: string,
  ): Promise<{
    orderId: string;
    status: string;
  }> {
    const { form, order } = webhookData;

    // Find matching workflow based on country and product
    const allWorkflows = await this.workflowsService.findAll();

    // Filter for matching Vizi workflows
    const workflows = allWorkflows.filter(
      (w) =>
        w.schema?.triggers?.some(
          (t) =>
            t.type === 'webhook' && t.config?.key === `vizi_${form.country}`,
        ) && w.enabled,
    );

    if (!workflows || workflows.length === 0) {
      this.logger.log(
        `No additional workflows found for Vizi ${form.country} - order creation workflow completed successfully`,
      );
      return {
        orderId: order.id,
        status: 'success',
      };
    }

    // Use the first matching workflow
    const workflow = workflows[0];

    // Prepare webhook context with all form data
    const webhookContext: Record<string, unknown> = {
      form: this.transformFormData(form),
      order: {
        id: order.id,
        form_id: order.form_id,
        branch: order.branch,
        domain: order.domain,
        payment_processor: order.payment_processor,
        payment_id: order.payment_id,
        amount: order.amount,
        currency: order.currency,
        coupon: order.coupon as Coupon | null,
        status: order.status,
      },
      metadata: {
        source: 'vizi_webhook',
        country: form.country,
        client_email: form.client?.email,
        client_name: form.client?.name,
        client_phone: `${form.client?.phone?.code}${form.client?.phone?.number}`,
        applicant_count: form.applicants?.length || 0,
        branch: form.meta?.branch,
        domain: form.meta?.domain,
        timestamp: new Date().toISOString(),
        correlationId,
      },
    };

    // Store webhook data in logs for audit trail
    const webhookId = uuidv4();
    await this.logService.createLog({
      level: 'info',
      message: 'Stored Vizi webhook data',
      metadata: {
        webhook_id: webhookId,
        type: 'vizi_order',
        data: webhookData,
        source: 'webhook',
      },
      correlation_id: correlationId,
    });

    // Queue the workflow for processing
    const queueName = form.urgency === 'few_hours' ? 'critical' : 'default';
    const job = await this.queueService.addJob(
      queueName,
      'process-workflow',
      {
        workflowId: workflow.id,
        context: webhookContext,
        webhookId: webhookId,
      },
      {
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    // Log workflow execution
    await this.logService.createLog({
      level: 'info',
      message: 'Queued Vizi webhook for workflow processing',
      metadata: {
        workflow_name: workflow.name,
        webhook_id: webhookId,
        country: form.country,
        order_id: order.id,
        correlationId,
        source: 'workflow',
      },
      workflow_id: workflow.id,
      job_id: job.id,
      correlation_id: correlationId,
    });

    return {
      orderId: order.id,
      status: 'queued',
    };
  }

  private transformFormData(form: VisaForm): Record<string, unknown> {
    // Transform form data to a common format for workflow processing
    const baseData = {
      id: form.id,
      country: form.country,
      client: form.client,
      product: form.product,
      quantity: form.quantity,
      urgency: form.urgency,
      discount: form.discount,
      termsAgreed: form.termsAgreed,
      orderId: form.orderId,
      meta: form.meta,
    };

    // Add country-specific fields
    if (isIndiaVisaForm(form)) {
      return {
        ...baseData,
        entry: form.entry,
        business: form.business,
        applicants: form.applicants.map((applicant) => ({
          ...applicant,
          // Ensure sensitive data is properly handled
          passport: {
            ...applicant.passport,
            number: applicant.passport.number, // Will be redacted in logs
          },
        })),
        fileTransferMethod: form.fileTransferMethod,
      };
    }

    // Add handlers for other countries as needed
    // For now, return the form as-is for other countries
    return { ...baseData, ...form } as Record<string, unknown>;
  }

  async retriggerOrders(dto: RetriggerOrdersDto): Promise<RetriggerResultDto> {
    const result: RetriggerResultDto = {
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    // Get webhook data based on mode
    let webhookPayloads: Array<{ orderId: string; webhookData: ViziWebhookDto }> = [];

    if (dto.mode === RetriggerMode.SINGLE) {
      if (!dto.orderId) {
        throw new BadRequestException('orderId is required for single mode');
      }
      const payload = await this.getWebhookDataForOrder(dto.orderId);
      if (payload) {
        webhookPayloads.push({ orderId: dto.orderId, webhookData: payload });
      } else {
        result.failed++;
        result.details.push({
          orderId: dto.orderId,
          status: 'failed',
          error: 'No webhook data found for this order',
        });
      }
    } else if (dto.mode === RetriggerMode.BULK) {
      if (dto.orderIds && dto.orderIds.length > 0) {
        // Bulk by order IDs
        for (const orderId of dto.orderIds) {
          const payload = await this.getWebhookDataForOrder(orderId);
          if (payload) {
            webhookPayloads.push({ orderId, webhookData: payload });
          } else {
            result.failed++;
            result.details.push({
              orderId,
              status: 'failed',
              error: 'No webhook data found',
            });
          }
        }
      } else if (dto.startDate || dto.endDate) {
        // Bulk by date range
        const payloads = await this.getWebhookDataByDateRange(dto.startDate, dto.endDate);
        webhookPayloads = payloads;
      } else {
        throw new BadRequestException(
          'Either orderIds or date range (startDate/endDate) is required for bulk mode',
        );
      }
    }

    // Process each webhook payload
    for (const { orderId, webhookData } of webhookPayloads) {
      try {
        // Check if order should be skipped
        if (dto.skipProcessed) {
          const orderExists = await this.checkOrderExists(orderId);
          if (orderExists) {
            result.skipped++;
            result.details.push({
              orderId,
              status: 'skipped',
              message: 'Order already exists in database',
            });
            continue;
          }
        }

        // Create correlation ID for tracking
        const correlationId = `retrigger-${orderId}-${Date.now()}`;

        // Log the retrigger attempt
        await this.logService.createLog({
          level: 'info',
          message: `Retriggering order ${orderId}`,
          metadata: {
            orderId,
            retrigger: true,
            correlationId,
            source: 'retrigger',
            webhook_data: webhookData, // Store the webhook data for audit
          },
          correlation_id: correlationId,
        });

        // EXACTLY replicate what the controller does:
        // 1. First normalize the data (same as controller lines 103-146)
        const order = webhookData.order;
        const form = webhookData.form;
        
        // 2. Validate webhook payload based on country (same as controller lines 204-207)
        if (!form || !order) {
          throw new Error('Missing required form or order data in stored webhook');
        }
        
        // 3. Normalize the data (same as controller lines 103-146)
        if (order?.branch) {
          order.branch = order.branch.toLowerCase() as typeof order.branch;
        }

        // Ensure payment_processor is valid
        const validProcessors = ['stripe', 'paypal', 'tbank', 'bill', 'bit', 'paybox'];
        if (order?.payment_processor && !validProcessors.includes(order.payment_processor)) {
          this.logger.warn(
            `Invalid payment processor: ${order.payment_processor}, defaulting to stripe`,
          );
          order.payment_processor = 'stripe';
        }

        // Ensure status is valid
        const validStatuses = ['active', 'completed', 'issue', 'canceled'];
        if (order?.status && !validStatuses.includes(order.status)) {
          this.logger.warn(
            `Invalid order status: ${order.status}, defaulting to active`,
          );
          order.status = 'active';
        }

        // 4. Save order to database (same as controller line 214-256) WITH SAME ERROR HANDLING
        let dbOrderId: string;
        try {
          dbOrderId = await this.ordersService.createOrder(webhookData);
          this.logger.log(
            `Order saved to database: ${orderId} (DB ID: ${dbOrderId})`,
          );
        } catch (dbError) {
          const err = dbError as Record<string, unknown>;
          const errorDetails = {
            message: err.message,
            code: err.code,
            detail: err.detail,
            stack: err.stack,
          };

          this.logger.error(
            `Failed to save order ${orderId} to database during retrigger: ${JSON.stringify(errorDetails)}`,
            typeof err.stack === 'string' ? err.stack : undefined,
          );

          // Log the failed order creation with full details (same as controller)
          await this.logService.createLog({
            level: 'error',
            message: `Order creation failed during retrigger for ${orderId}`,
            metadata: {
              webhook_type: 'vizi_order',
              order_id: orderId,
              form_id: form?.id,
              error: errorDetails,
              webhook_data: webhookData,
              correlationId,
              source: 'retrigger',
              retrigger: true,
            },
            correlation_id: correlationId,
          });

          // Re-throw to be caught by outer error handler
          throw new Error(`Failed to save order to database: ${err instanceof Error ? err.message : String(err)}`);
        }

        // 5. Process the webhook (same as controller line 258-262)
        const processResult = await this.processViziOrder(webhookData, correlationId);

        // 6. Log success WITH FULL WEBHOOK DATA (same as controller lines 270-286)
        await this.logService.createLog({
          level: 'info',
          message: `Order ${orderId} created successfully from retrigger`,
          metadata: {
            webhook_type: 'vizi_order',
            order_id: orderId,
            form_id: form?.id,
            order_db_id: dbOrderId,
            result_status: processResult.status,
            webhook_data: webhookData, // Save full payload for data recovery
            correlationId,
            source: 'retrigger',
            retrigger: true,
          },
          correlation_id: correlationId,
        });

        result.successful++;
        result.details.push({
          orderId,
          status: 'success',
          message: 'Order retriggered successfully',
        });

        this.logger.log(`Successfully retriggered order ${orderId}`);
      } catch (error) {
        // Enhanced error handling with detailed information
        let errorDetails: Record<string, unknown> = {};
        let errorMessage = 'Unknown error';
        
        if (error instanceof Error) {
          errorMessage = error.message;
          errorDetails = {
            name: error.name,
            message: error.message,
            stack: error.stack,
          };
          
          // Check for nested errors or specific error types
          if ('code' in error) {
            errorDetails.code = (error as Error & { code?: unknown }).code;
          }
          if ('details' in error) {
            errorDetails.details = (error as Error & { details?: unknown }).details;
          }
          if ('response' in error) {
            errorDetails.response = (error as Error & { response?: unknown }).response;
          }
        } else {
          // Handle non-Error objects
          errorDetails = {
            type: typeof error,
            value: error,
            stringified: String(error),
          };
          errorMessage = String(error);
        }

        result.failed++;
        result.details.push({
          orderId,
          status: 'failed',
          error: errorMessage,
        });

        this.logger.error(`Failed to retrigger order ${orderId}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);

        await this.logService.createLog({
          level: 'error',
          message: `Failed to retrigger order ${orderId}`,
          metadata: {
            orderId,
            error: errorMessage,
            errorDetails,
            retrigger: true,
            source: 'retrigger',
            correlationId: `retrigger-${orderId}-${Date.now()}`,
          },
        });
      }
    }

    // Log summary
    await this.logService.createLog({
      level: 'info',
      message: 'Retrigger operation completed',
      metadata: {
        successful: result.successful,
        failed: result.failed,
        skipped: result.skipped,
        mode: dto.mode,
        source: 'retrigger',
      },
    });

    return result;
  }

  private async getWebhookDataForOrder(orderId: string): Promise<ViziWebhookDto | null> {
    const supabase = this.supabaseService.client;
    
    // Simple approach: get recent logs and filter in memory
    // Supabase JS doesn't handle complex JSONB queries well
    const { data, error } = await supabase
      .from('logs')
      .select('metadata')
      .order('created_at', { ascending: false })
      .limit(500); // Get recent logs

    if (error || !data || data.length === 0) {
      this.logger.warn(`No logs found when searching for order ${orderId}`);
      return null;
    }

    // Filter for the specific order
    for (const log of data) {
      const metadata = log.metadata as Record<string, any>;
      
      // Check if this is a vizi_order log with webhook_data
      if (metadata?.webhook_type === 'vizi_order' && metadata?.webhook_data) {
        const webhookData = metadata.webhook_data;
        const webhookOrderId = webhookData?.order?.id;
        const metadataOrderId = metadata?.order_id;
        
        if (webhookOrderId === orderId || metadataOrderId === orderId) {
          this.logger.log(`Found webhook data for order ${orderId}`);
          return webhookData as ViziWebhookDto;
        }
      }
    }

    this.logger.warn(`No webhook data found for order ${orderId} after checking ${data.length} logs`);
    return null;
  }

  private async getWebhookDataByDateRange(
    startDate?: string,
    endDate?: string,
  ): Promise<Array<{ orderId: string; webhookData: ViziWebhookDto }>> {
    const supabase = this.supabaseService.client;
    
    // Simpler approach: just get ALL logs and filter in memory
    // Supabase JS client doesn't handle nested JSONB filtering well
    let query = supabase
      .from('logs')
      .select('metadata, created_at');

    // Add date filters if provided
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Order and limit
    query = query.order('created_at', { ascending: false }).limit(1000);

    const { data, error } = await query;
    
    this.logger.log(`Date range query returned ${data?.length || 0} total logs`);

    if (error || !data) {
      this.logger.error(`Failed to fetch webhook data by date range: ${error?.message}`);
      return [];
    }

    const results: Array<{ orderId: string; webhookData: ViziWebhookDto }> = [];
    
    // Filter for vizi_order logs with webhook_data
    for (const log of data) {
      const metadata = log.metadata as Record<string, any>;
      
      // Check if this is a vizi_order log with webhook_data
      if (metadata?.webhook_type === 'vizi_order' && metadata?.webhook_data) {
        const webhookData = metadata.webhook_data;
        const orderId = webhookData?.order?.id || metadata?.order_id;
        
        if (orderId) {
          results.push({ orderId, webhookData: webhookData as ViziWebhookDto });
          this.logger.log(`Found webhook data for order ${orderId}`);
        }
      }
    }

    this.logger.log(`Found ${results.length} vizi_order webhook payloads in date range`);
    return results;
  }

  private async checkOrderExists(orderId: string): Promise<boolean> {
    const supabase = this.supabaseService.client;
    
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .eq('order_id', orderId)
      .limit(1);

    if (error) {
      this.logger.error(`Failed to check if order exists: ${error.message}`);
      return false;
    }

    return data && data.length > 0;
  }
}
