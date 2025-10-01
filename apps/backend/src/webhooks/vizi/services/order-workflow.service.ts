import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  Coupon,
  ViziWebhookDto,
  VisaForm,
  isIndiaVisaForm,
} from '@visapi/visanet-types';
import { QueueService } from '../../../queue/queue.service';
import { WorkflowsService } from '../../../workflows/workflows.service';
import { LogService } from '@visapi/backend-logging';

export interface OrderWorkflowResult {
  orderId: string;
  status: string;
}

@Injectable()
export class ViziOrderWorkflowService {
  private readonly logger = new Logger(ViziOrderWorkflowService.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly workflowsService: WorkflowsService,
    private readonly logService: LogService,
  ) {}

  async processOrder(
    webhookData: ViziWebhookDto,
    correlationId?: string,
  ): Promise<OrderWorkflowResult> {
    const { form, order } = webhookData;

    const workflows = await this.findWorkflowsForCountry(form.country);

    if (workflows.length === 0) {
      this.logger.log(
        `No additional workflows found for Vizi ${form.country} - order creation workflow completed successfully`,
      );
      return {
        orderId: order.id,
        status: 'success',
      };
    }

    const workflow = workflows[0];
    const webhookContext = this.buildWorkflowContext({
      form,
      order,
      correlationId,
    });

    const webhookId = randomUUID();
    await this.persistWebhookPayload(webhookId, webhookData, correlationId);

    const queueName = form.urgency === 'few_hours' ? 'critical' : 'default';
    const job = await this.queueService.addJob(
      queueName,
      'process-workflow',
      {
        workflowId: workflow.id,
        context: webhookContext,
        webhookId,
      },
      {
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

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

  private async findWorkflowsForCountry(country: string) {
    const allWorkflows = await this.workflowsService.findAll();
    return allWorkflows.filter(
      (workflow) =>
        workflow.enabled &&
        workflow.schema?.triggers?.some(
          (trigger) =>
            trigger.type === 'webhook' &&
            trigger.config?.key === `vizi_${country}`,
        ),
    );
  }

  private buildWorkflowContext({
    form,
    order,
    correlationId,
  }: {
    form: VisaForm;
    order: ViziWebhookDto['order'];
    correlationId?: string;
  }): Record<string, unknown> {
    return {
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
  }

  private async persistWebhookPayload(
    webhookId: string,
    webhookData: ViziWebhookDto,
    correlationId?: string,
  ) {
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
  }

  private transformFormData(form: VisaForm): Record<string, unknown> {
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

    if (isIndiaVisaForm(form)) {
      return {
        ...baseData,
        entry: form.entry,
        business: form.business,
        applicants: form.applicants.map((applicant) => ({
          ...applicant,
          passport: {
            ...applicant.passport,
            number: applicant.passport.number,
          },
        })),
        fileTransferMethod: form.fileTransferMethod,
      };
    }

    return { ...baseData, ...form } as Record<string, unknown>;
  }
}
