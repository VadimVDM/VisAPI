import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class ViziWebhooksService {
  private readonly logger = new Logger(ViziWebhooksService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
    private readonly workflowsService: WorkflowsService,
    private readonly supabaseService: SupabaseService,
    private readonly logService: LogService,
  ) {}

  async processViziOrder(
    webhookData: ViziWebhookDto,
    correlationId?: string,
  ): Promise<{
    workflowId: string | null;
    jobId: string | null;
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
      this.logger.warn(
        `No active workflow found for Vizi ${form.country} webhook`,
      );
      return {
        workflowId: null,
        jobId: null,
        status: 'no_workflow',
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
        product_name: form.product?.name,
        client_email: form.client?.email,
        client_name: form.client?.name,
        client_phone: `${form.client?.phone?.code}${form.client?.phone?.number}`,
        applicant_count: form.applicants?.length || 0,
        urgency: form.urgency,
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
      workflowId: workflow.id,
      jobId: job.id,
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
}
