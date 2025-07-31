import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { N8nWebhookDto, N8nBusinessDto } from './dto/n8n-order.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    @InjectQueue('workflows') private readonly workflowQueue: Queue,
  ) {}

  async processN8nWebhook(data: N8nWebhookDto, headers: Record<string, string>): Promise<void> {
    const startTime = Date.now();
    const { form, order } = data;

    try {
      // Log the webhook receipt
      await this.logWebhook('n8n.visanet.app', '/api/v1/webhooks/n8n/orders', 'POST', headers, data, startTime);

      // Start a transaction by inserting the order first
      const orderRecord = await this.createOrder(order, data);
      
      // Create form metadata
      await this.createFormMetadata(orderRecord.id, form);
      
      // Create applicants
      await this.createApplicants(orderRecord.id, form.applicants);

      // Create business info if present
      if (form.business && form.business.name) {
        await this.createBusinessInfo(orderRecord.id, form.business);
      }

      // Queue any additional processing (e.g., send notifications, generate PDFs)
      await this.queuePostProcessing(orderRecord.id, order.id);

      this.logger.log(`Successfully processed n8n webhook for order ${order.id} with ${form.applicants.length} applicants`);
    } catch (error) {
      this.logger.error(`Failed to process n8n webhook for order ${order?.id}:`, error);
      // Log the error in webhook logs
      await this.logWebhookError('n8n.visanet.app', '/api/v1/webhooks/n8n/orders', 'POST', headers, data, error.message, startTime);
      throw error;
    }
  }

  private async createOrder(orderData: N8nWebhookDto['order'], fullData: N8nWebhookDto) {
    const { data, error } = await this.supabaseService.client
      .from('orders')
      .insert({
        order_id: orderData.id,
        form_id: orderData.form_id,
        payment_id: orderData.payment_id,
        payment_processor: orderData.payment_processor,
        amount: orderData.amount,
        currency: orderData.currency,
        coupon: orderData.coupon,
        status: orderData.status,
        branch: orderData.branch,
        domain: orderData.domain,
        raw_data: fullData,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }

    return data;
  }

  private async createFormMetadata(orderId: string, formData: N8nWebhookDto['form']) {
    const { error } = await this.supabaseService.client
      .from('form_metadata')
      .insert({
        order_id: orderId,
        form_id: formData.id,
        country: formData.country,
        entry_date: formData.entry.date,
        entry_port: formData.entry.port,
        product: formData.product,
        quantity: formData.quantity,
        urgency: formData.urgency,
        client: formData.client,
        meta: formData.meta,
        children: formData.children || [],
        stay_address: formData.stayAddress || null,
      });

    if (error) {
      throw new Error(`Failed to create form metadata: ${error.message}`);
    }
  }

  private async createApplicants(orderId: string, applicants: N8nWebhookDto['form']['applicants']) {
    const applicantRecords = applicants.map(applicant => ({
      order_id: orderId,
      applicant_id: applicant.id,
      
      // Passport information (handle UK ETA minimal data)
      passport_nationality: applicant.passport.nationality || null,
      passport_first_name: applicant.passport.firstName,
      passport_last_name: applicant.passport.lastName,
      passport_sex: applicant.passport.sex || null,
      passport_date_of_birth: applicant.passport.dateOfBirth || null,
      passport_country_of_birth: applicant.passport.countryOfBirth || null,
      passport_number: applicant.passport.number || null,
      passport_date_of_issue: applicant.passport.dateOfIssue || null,
      passport_date_of_expiry: applicant.passport.dateOfExpiry || null,
      passport_place_of_issue: applicant.passport.placeOfIssue || null,
      
      // Past visit information (handle both old and new format)
      past_visit_visited: applicant.pastVisit?.visited || applicant.pastTravels?.pastVisit?.visited || false,
      past_visit_year: applicant.pastVisit?.year || applicant.pastTravels?.pastVisit?.year || null,
      
      // Address information (optional for Morocco visas)
      address_line: applicant.address?.line || null,
      address_city: applicant.address?.city || null,
      address_country: applicant.address?.country || null,
      address_set_by: applicant.address?.setBy || null,
      
      // Occupation information (handle both object and string format)
      occupation_education: typeof applicant.occupation === 'object' ? applicant.occupation.education : null,
      occupation_status: typeof applicant.occupation === 'object' ? applicant.occupation.status : applicant.occupation,
      occupation_name: typeof applicant.occupation === 'object' ? applicant.occupation.name : null,
      occupation_seniority: typeof applicant.occupation === 'object' ? applicant.occupation.seniority : null,
      occupation_phone: typeof applicant.occupation === 'object' ? applicant.occupation.phone : null,
      occupation_address: typeof applicant.occupation === 'object' ? applicant.occupation.address : null,
      
      // Extra nationality (optional for Saudi visas)
      extra_nationality_status: applicant.extraNationality?.status || null,
      
      // Family information
      family_data: applicant.family || null,
      
      // File URLs
      files: applicant.files,
      
      // Additional fields
      id_number: applicant.idNumber || null,
      crime: applicant.crime || null,
      religion: applicant.religion || null,
      military: applicant.military || null,
      past_travels: applicant.pastTravels || null,
      
      // Korean visa specific fields
      visited: applicant.visited || false,
      city_of_birth: applicant.cityOfBirth || null,
      last_travel: applicant.lastTravel || null,
      
      // Saudi visa specific fields
      marital_status: applicant.maritalStatus || null,
      guardian_passport: applicant.guardianPassport || null,
    }));

    const { error } = await this.supabaseService.client
      .from('applicants')
      .insert(applicantRecords);

    if (error) {
      throw new Error(`Failed to create applicants: ${error.message}`);
    }
  }

  private async createBusinessInfo(orderId: string, business: N8nWebhookDto['form']['business']) {
    if (!business || !business.name) {
      return; // Skip if no business info
    }

    const { error } = await this.supabaseService.client
      .from('business_info')
      .insert({
        order_id: orderId,
        name: business.name,
        sector: business.sector,
        website: business.website,
        address_line: business.address?.line || null,
        address_city: business.address?.city || null,
        address_country: business.address?.country || null,
        phone: business.phone || null,
      });

    if (error) {
      throw new Error(`Failed to create business info: ${error.message}`);
    }
  }

  private async queuePostProcessing(orderId: string, externalOrderId: string) {
    // Queue a job for any post-processing like sending notifications
    await this.workflowQueue.add(
      'process-new-order',
      {
        orderId,
        externalOrderId,
        type: 'n8n-visa-order',
      },
      {
        priority: 2, // Default priority
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  }

  private async logWebhook(
    source: string,
    endpoint: string,
    method: string,
    headers: Record<string, string>,
    body: any,
    startTime: number
  ) {
    const processingTime = Date.now() - startTime;
    
    await this.supabaseService.client
      .from('webhook_logs')
      .insert({
        source,
        endpoint,
        method,
        headers,
        body,
        status_code: 200,
        processing_time_ms: processingTime,
      });
  }

  private async logWebhookError(
    source: string,
    endpoint: string,
    method: string,
    headers: Record<string, string>,
    body: any,
    error: string,
    startTime: number
  ) {
    const processingTime = Date.now() - startTime;
    
    await this.supabaseService.client
      .from('webhook_logs')
      .insert({
        source,
        endpoint,
        method,
        headers,
        body,
        status_code: 500,
        error,
        processing_time_ms: processingTime,
      });
  }
}