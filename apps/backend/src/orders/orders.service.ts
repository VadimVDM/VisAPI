import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { ViziWebhookDto } from '@visapi/visanet-types';
import { QueueService } from '../queue/queue.service';
import { QUEUE_NAMES, Json } from '@visapi/shared-types';
import { ConfigService } from '@visapi/core-config';

interface OrderTableData {
  // Core order fields
  order_id: string;
  form_id: string;
  branch: string;
  domain: string;
  payment_processor: string;
  payment_id: string;
  amount: number;
  currency: string;
  order_status: string;

  // Client fields
  client_name: string;
  client_email: string;
  client_phone: string;
  whatsapp_alerts_enabled: boolean;

  // Product fields
  product_name: string;
  product_country: string;
  product_doc_type?: string;
  product_doc_name?: string;

  // Visa details
  visa_quantity: number;
  urgency?: string;
  file_transfer_method?: string;

  // Entry details
  entry_date?: string;
  entry_port?: string;
  entry_type?: string;

  // Document URLs
  face_url?: string;
  passport_url?: string;

  // JSON fields
  passport_data?: Json;
  extra_nationality_data?: Json;
  address_data?: Json;
  family_data?: Json;
  occupation_data?: Json;
  military_data?: Json;
  past_travels_data?: Json;
  emergency_contact_data?: Json;
  business_data?: Json;
  files_data?: Json;
  coupon_data?: Json;
  form_meta_data?: Json;
  applicants_data?: Json;
  extra_data?: Json;

  // Tracking
  webhook_received_at: string;
  processed_at?: string;
  workflow_id?: string;
  job_id?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new order from Vizi webhook data
   */
  async createOrder(webhookData: ViziWebhookDto): Promise<string> {
    try {
      // Log the incoming webhook data structure for debugging
      this.logger.debug(
        `Received webhook data: ${JSON.stringify({
          orderId: webhookData.order?.id,
          formId: webhookData.form?.id,
          hasOrder: !!webhookData.order,
          hasForm: !!webhookData.form,
          orderFields: webhookData.order ? Object.keys(webhookData.order) : [],
          formFields: webhookData.form ? Object.keys(webhookData.form) : [],
        })}`,
      );

      const orderData = this.transformWebhookToOrder(webhookData);

      // Validate required fields before insert
      const missingFields = [];
      if (!orderData.order_id) missingFields.push('order_id');
      if (!orderData.form_id) missingFields.push('form_id');
      if (!orderData.branch) missingFields.push('branch');
      if (!orderData.domain) missingFields.push('domain');
      if (!orderData.payment_processor) missingFields.push('payment_processor');
      if (!orderData.payment_id) missingFields.push('payment_id');
      if (orderData.amount === null || orderData.amount === undefined)
        missingFields.push('amount');
      if (!orderData.currency) missingFields.push('currency');
      if (!orderData.order_status) missingFields.push('order_status');
      if (!orderData.client_name) missingFields.push('client_name');
      if (!orderData.client_email) missingFields.push('client_email');
      if (!orderData.client_phone) missingFields.push('client_phone');
      if (!orderData.product_name) missingFields.push('product_name');
      if (!orderData.product_country) missingFields.push('product_country');
      if (!orderData.webhook_received_at)
        missingFields.push('webhook_received_at');

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      this.logger.log(`Creating order: ${orderData.order_id}`);

      const { data, error } = await this.supabaseService.serviceClient
        .from('orders')
        .insert(orderData)
        .select('id')
        .single();

      if (error) {
        // Check if it's a duplicate order error
        if (
          error.code === '23505' ||
          error.message?.includes('Duplicate order_id')
        ) {
          this.logger.warn(`Order ${orderData.order_id} already exists`);
          // Return existing order ID
          const { data: existing } = await this.supabaseService.serviceClient
            .from('orders')
            .select('id')
            .eq('order_id', orderData.order_id)
            .single();
          return existing?.id || '';
        }

        this.logger.error('Failed to create order', error);
        throw new Error(`Failed to create order: ${error.message}`);
      }

      this.logger.log(`Order created successfully: ${data.id}`);

      // Trigger CBB sync ONLY for IL branch orders
      const isILBranch = orderData.branch?.toLowerCase() === 'il';
      if (isILBranch) {
        try {
          const syncDelay = this.configService.cbbSyncDelayMs || 2000;
          await this.queueService.addJob(
            QUEUE_NAMES.CBB_SYNC,
            'sync-contact',
            { orderId: orderData.order_id },
            {
              delay: syncDelay,
              attempts: 3,
              removeOnComplete: true,
              removeOnFail: false,
            },
          );
          this.logger.log(
            `CBB sync queued for IL branch order ${orderData.order_id} (WhatsApp alerts: ${orderData.whatsapp_alerts_enabled})`,
          );
        } catch (error) {
          // Don't fail the order creation if queue fails
          this.logger.error(
            `Failed to queue CBB sync for order ${orderData.order_id}:`,
            error,
          );
        }
      } else {
        this.logger.debug(
          `CBB sync skipped for non-IL branch order ${orderData.order_id} (branch: ${orderData.branch})`,
        );
      }

      return data.id;
    } catch (error) {
      this.logger.error(
        `Error creating order: ${(error as Error).message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update order processing status
   */
  async updateOrderProcessing(
    orderId: string,
    workflowId?: string,
    jobId?: string,
  ): Promise<void> {
    try {
      const { error } = await this.supabaseService.client
        .from('orders')
        .update({
          processed_at: new Date().toISOString(),
          workflow_id: workflowId,
          job_id: jobId,
        })
        .eq('order_id', orderId);

      if (error) {
        this.logger.error(`Failed to update order ${orderId}`, error);
      } else {
        this.logger.log(`Order ${orderId} processing status updated`);
      }
    } catch (error) {
      this.logger.error(
        `Error updating order ${orderId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get order by order_id
   */
  async getOrderByOrderId(orderId: string): Promise<OrderTableData | null> {
    const { data, error } = await this.supabaseService.client
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      this.logger.error(`Failed to get order ${orderId}`, error);
      return null;
    }

    return data;
  }

  /**
   * Parse entry date safely
   */
  private parseEntryDate(date: unknown): string | undefined {
    if (!date) {
      return undefined;
    }

    try {
      // Handle various date formats
      const parsedDate = new Date(date as string | number | Date);
      if (isNaN(parsedDate.getTime())) {
        this.logger.warn(`Invalid entry date format: ${String(date)}`);
        return undefined;
      }
      return parsedDate.toISOString();
    } catch {
      this.logger.warn(`Failed to parse entry date: ${String(date)}`);
      return undefined;
    }
  }

  /**
   * Transform phone number from object to string format
   * { code: "+44", number: "1234567890" } => "441234567890"
   */
  private transformPhoneNumber(
    phone: { code: string; number: string } | string | undefined,
  ): string {
    try {
      if (!phone) {
        return '0000000000'; // Fallback for missing phone
      }

      if (typeof phone === 'string') {
        // Already a string, just clean it
        return phone.replace(/^\+/, '').replace(/\D/g, '') || '0000000000';
      }

      if (!phone.code || !phone.number) {
        return '0000000000'; // Fallback for missing phone parts
      }

      // Remove + from country code and all non-digits from number
      const cleanCode = (phone.code || '')
        .replace(/^\+/, '')
        .replace(/\D/g, '');
      const cleanNumber = (phone.number || '').replace(/\D/g, '');

      if (!cleanCode || !cleanNumber) {
        return '0000000000';
      }

      return `${cleanCode}${cleanNumber}`;
    } catch {
      this.logger.warn(
        `Failed to transform phone number: ${JSON.stringify(phone)}, using fallback`,
      );
      return '0000000000';
    }
  }

  /**
   * Transform Vizi webhook data to orders table format
   */
  private transformWebhookToOrder(webhook: ViziWebhookDto): OrderTableData {
    const { form, order } = webhook;

    // Extract face and passport URLs from first applicant's files
    const firstApplicant = form.applicants?.[0] as unknown;
    const applicantFiles =
      (firstApplicant as { files?: Record<string, unknown> })?.files || {};
    const faceUrl = applicantFiles.face || null;
    const passportUrl = applicantFiles.passport || null;

    // Create files_data without face and passport (those are in dedicated columns)
    const otherFiles = { ...applicantFiles };
    delete otherFiles.face;
    delete otherFiles.passport;

    // Transform the data
    const orderData: OrderTableData = {
      // Order core data
      order_id: order.id,
      form_id: order.form_id || form.id || order.id, // Use form.id as fallback, then order.id
      branch: order.branch || this.extractBranchFromOrderId(order.id),
      domain: order.domain || 'visanet.app',
      payment_processor: order.payment_processor || 'stripe',
      payment_id: order.payment_id || `pending_${order.id}`,
      amount: order.amount !== undefined ? order.amount : 0,
      currency: order.currency || this.getCurrencyForCountry(form.country),
      order_status: order.status || 'pending',

      // Client information (with phone transformation)
      client_name: form.client?.name || 'Unknown',
      client_email: form.client?.email || 'unknown@example.com',
      client_phone: this.transformPhoneNumber(form.client?.phone),
      whatsapp_alerts_enabled: form.client?.whatsappAlertsEnabled || false, // VERY IMPORTANT!

      // Product details
      product_name: form.product?.name || `${form.country} Visa`,
      product_country: form.product?.country || form.country || 'unknown',
      product_doc_type: form.product?.docType,
      product_doc_name: form.product?.docName,

      // Visa details (NOW AS INDIVIDUAL COLUMNS)
      visa_quantity: form.quantity || 1,
      entry_date: this.parseEntryDate(
        (
          (form as unknown as Record<string, unknown>).entry as {
            date?: unknown;
          }
        )?.date,
      ),
      urgency: form.urgency || 'standard',
      file_transfer_method: (form as unknown as Record<string, unknown>)
        .fileTransferMethod as string | undefined,

      // Entry information
      entry_port: (
        (form as unknown as Record<string, unknown>).entry as { port?: string }
      )?.port,
      entry_type: (
        (form as unknown as Record<string, unknown>).entry as {
          crossing?: { type?: string };
        }
      )?.crossing?.type,

      // Document URLs (FACE AND PASSPORT AS DEDICATED COLUMNS)
      face_url: faceUrl as string | undefined,
      passport_url: passportUrl as string | undefined,

      // Categorized JSON data
      passport_data: form.applicants?.[0]?.passport || null,
      extra_nationality_data:
        (firstApplicant as { extraNationality?: Json })?.extraNationality ||
        null,
      address_data: {
        personal: (firstApplicant as { address?: Json })?.address,
        work: (
          (firstApplicant as { occupation?: Json })?.occupation as {
            address?: Json;
          }
        )?.address,
      } as Json,
      family_data: (firstApplicant as { family?: Json })?.family || null,
      occupation_data:
        (firstApplicant as { occupation?: Json })?.occupation || null,
      military_data: (firstApplicant as { military?: Json })?.military || null,
      past_travels_data:
        (firstApplicant as { pastTravels?: Json })?.pastTravels || null,
      emergency_contact_data: (form as unknown as Record<string, unknown>)
        ?.emergencyContact as Json | null,
      business_data: (form as unknown as Record<string, unknown>)
        ?.business as Json | null,
      files_data:
        Object.keys(otherFiles).length > 0 ? (otherFiles as Json) : null, // Other documents
      coupon_data: (order.coupon || form.discount) as Json | null,
      form_meta_data: form.meta || null,

      // Full applicants array for multi-applicant orders
      applicants_data: (form.applicants || []) as unknown as Json,

      // Store any extra country-specific fields
      extra_data: this.extractExtraFields(form as unknown as Json),

      // Tracking
      webhook_received_at: new Date().toISOString(),
      processed_at: undefined, // Set when processing completes
      workflow_id: undefined, // Set if workflow triggered
      job_id: undefined, // Set if job queued
    };

    return orderData;
  }

  /**
   * Extract branch code from order ID
   */
  private extractBranchFromOrderId(orderId: string): string {
    // Order IDs like "IL250819GB16" - first 2 chars are branch
    if (!orderId || orderId.length < 2) {
      return 'il'; // Default to 'il' which is a valid branch code
    }
    const extracted = orderId.substring(0, 2).toLowerCase();

    // Map to valid branch codes
    const validBranches = ['se', 'co', 'il', 'ru', 'kz'];
    if (validBranches.includes(extracted)) {
      return extracted;
    }

    // Default to 'il' if not a recognized branch
    return 'il';
  }

  /**
   * Get currency for country
   */
  private getCurrencyForCountry(country: string): string {
    const currencyMap: Record<string, string> = {
      uk: 'GBP',
      gb: 'GBP',
      usa: 'USD',
      us: 'USD',
      canada: 'CAD',
      ca: 'CAD',
      india: 'INR',
      in: 'INR',
      israel: 'ILS',
      il: 'ILS',
      vietnam: 'VND',
      vn: 'VND',
      korea: 'KRW',
      kr: 'KRW',
      morocco: 'MAD',
      ma: 'MAD',
      saudi_arabia: 'SAR',
      sa: 'SAR',
      schengen: 'EUR',
      eu: 'EUR',
    };
    return currencyMap[country?.toLowerCase()] || 'USD';
  }

  /**
   * Extract fields not in standard structure
   */
  private extractExtraFields(form: Json): Json {
    // Only process if form is an object
    if (!form || typeof form !== 'object' || Array.isArray(form)) {
      return null;
    }

    const formObj = form as { [key: string]: Json | undefined };
    const standardFields = [
      'id',
      'country',
      'client',
      'product',
      'quantity',
      'urgency',
      'discount',
      'termsAgreed',
      'orderId',
      'meta',
      'entry',
      'business',
      'applicants',
      'fileTransferMethod',
      'emergencyContact',
    ];

    const extraFields: { [key: string]: Json | undefined } = {
      termsAgreed: formObj.termsAgreed,
      orderId: formObj.orderId,
    };

    // Add any non-standard fields
    for (const key in formObj) {
      if (!standardFields.includes(key)) {
        extraFields[key] = formObj[key];
      }
    }

    return Object.keys(extraFields).length > 0 ? extraFields : null;
  }

  /**
   * Query orders with filters
   */
  async queryOrders(
    filters: {
      limit?: number;
      offset?: number;
      country?: string;
      status?: string;
      from_date?: string;
      to_date?: string;
    } = {},
  ): Promise<OrderTableData[]> {
    let query = this.supabaseService.client.from('orders').select('*');

    if (filters.country) {
      query = query.eq('product_country', filters.country);
    }

    if (filters.status) {
      query = query.eq('order_status', filters.status);
    }

    if (filters.from_date) {
      query = query.gte('webhook_received_at', filters.from_date);
    }

    if (filters.to_date) {
      query = query.lte('webhook_received_at', filters.to_date);
    }

    query = query
      .order('webhook_received_at', { ascending: false })
      .limit(filters.limit || 100)
      .range(
        filters.offset || 0,
        (filters.offset || 0) + (filters.limit || 100) - 1,
      );

    const { data, error } = await query;

    if (error) {
      this.logger.error('Failed to query orders', error);
      return [];
    }

    return data || [];
  }
}
