import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { ViziWebhookDto } from '@visapi/visanet-types';
import { QueueService } from '../queue/queue.service';
import { QUEUE_NAMES, JOB_NAMES } from '@visapi/shared-types';
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
  passport_data?: any;
  extra_nationality_data?: any;
  address_data?: any;
  family_data?: any;
  occupation_data?: any;
  military_data?: any;
  past_travels_data?: any;
  emergency_contact_data?: any;
  business_data?: any;
  files_data?: any;
  coupon_data?: any;
  form_meta_data?: any;
  applicants_data?: any;
  extra_data?: any;
  
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
      const orderData = this.transformWebhookToOrder(webhookData);
      
      this.logger.log(`Creating order: ${orderData.order_id}`);
      
      const { data, error } = await this.supabaseService
        .client
        .from('orders')
        .insert(orderData)
        .select('id')
        .single();
      
      if (error) {
        // Check if it's a duplicate order error
        if (error.code === '23505' || error.message?.includes('Duplicate order_id')) {
          this.logger.warn(`Order ${orderData.order_id} already exists`);
          // Return existing order ID
          const { data: existing } = await this.supabaseService
            .client
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
      
      // Trigger CGB sync for ALL orders (not just WhatsApp enabled)
      const cgbSyncEnabled = this.configService.cgbSyncEnabled !== false;
      if (cgbSyncEnabled) {
        try {
          const syncDelay = this.configService.cgbSyncDelayMs || 2000;
          await this.queueService.addJob(
            QUEUE_NAMES.CGB_SYNC, 
            'sync-contact', 
            { orderId: orderData.order_id },
            {
              delay: syncDelay,
              attempts: 3,
              removeOnComplete: true,
              removeOnFail: false,
            }
          );
          this.logger.log(`CGB sync queued for order ${orderData.order_id} (WhatsApp alerts: ${orderData.whatsapp_alerts_enabled})`);
        } catch (error) {
          // Don't fail the order creation if queue fails
          this.logger.error(`Failed to queue CGB sync for order ${orderData.order_id}:`, error);
        }
      } else {
        this.logger.debug(`CGB sync disabled globally for order ${orderData.order_id}`);
      }
      
      return data.id;
    } catch (error) {
      this.logger.error(`Error creating order: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update order processing status
   */
  async updateOrderProcessing(
    orderId: string, 
    workflowId?: string, 
    jobId?: string
  ): Promise<void> {
    try {
      const { error } = await this.supabaseService
        .client
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
      this.logger.error(`Error updating order ${orderId}: ${error.message}`);
    }
  }

  /**
   * Get order by order_id
   */
  async getOrderByOrderId(orderId: string): Promise<any> {
    const { data, error } = await this.supabaseService
      .client
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
  private parseEntryDate(date: any): string | undefined {
    if (!date) {
      return undefined;
    }
    
    try {
      // Handle various date formats
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        this.logger.warn(`Invalid entry date format: ${date}`);
        return undefined;
      }
      return parsedDate.toISOString();
    } catch (error) {
      this.logger.warn(`Failed to parse entry date: ${date}`);
      return undefined;
    }
  }

  /**
   * Transform phone number from object to string format
   * { code: "+44", number: "1234567890" } => "441234567890"
   */
  private transformPhoneNumber(phone: { code: string; number: string } | string | undefined): string {
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
      const cleanCode = (phone.code || '').replace(/^\+/, '').replace(/\D/g, '');
      const cleanNumber = (phone.number || '').replace(/\D/g, '');
      
      if (!cleanCode || !cleanNumber) {
        return '0000000000';
      }
      
      return `${cleanCode}${cleanNumber}`;
    } catch (error) {
      this.logger.warn(`Failed to transform phone number: ${JSON.stringify(phone)}, using fallback`);
      return '0000000000';
    }
  }

  /**
   * Transform Vizi webhook data to orders table format
   */
  private transformWebhookToOrder(webhook: ViziWebhookDto): OrderTableData {
    const { form, order } = webhook;
    
    // Extract face and passport URLs from first applicant's files
    const applicantFiles = (form.applicants?.[0] as any)?.files || {};
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
      form_id: order.form_id,
      branch: order.branch || this.extractBranchFromOrderId(order.id),
      domain: order.domain || 'unknown',
      payment_processor: order.payment_processor || 'unknown',
      payment_id: order.payment_id || 'unknown',
      amount: order.amount || 0,
      currency: order.currency || this.getCurrencyForCountry(form.country),
      order_status: order.status || 'active',
      
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
      entry_date: this.parseEntryDate((form as any).entry?.date),
      urgency: form.urgency || 'standard',
      file_transfer_method: (form as any).fileTransferMethod,
      
      // Entry information
      entry_port: (form as any).entry?.port,
      entry_type: (form as any).entry?.crossing?.type,
      
      // Document URLs (FACE AND PASSPORT AS DEDICATED COLUMNS)
      face_url: faceUrl,
      passport_url: passportUrl,
      
      // Categorized JSON data
      passport_data: form.applicants?.[0]?.passport || null,
      extra_nationality_data: (form.applicants?.[0] as any)?.extraNationality || null,
      address_data: {
        personal: (form.applicants?.[0] as any)?.address,
        work: (form.applicants?.[0] as any)?.occupation?.address,
      },
      family_data: (form.applicants?.[0] as any)?.family || null,
      occupation_data: (form.applicants?.[0] as any)?.occupation || null,
      military_data: (form.applicants?.[0] as any)?.military || null,
      past_travels_data: (form.applicants?.[0] as any)?.pastTravels || null,
      emergency_contact_data: (form as any)?.emergencyContact || null,
      business_data: (form as any)?.business || null,
      files_data: Object.keys(otherFiles).length > 0 ? otherFiles : null, // Other documents
      coupon_data: order.coupon || form.discount || null,
      form_meta_data: form.meta || null,
      
      // Full applicants array for multi-applicant orders
      applicants_data: form.applicants || [],
      
      // Store any extra country-specific fields
      extra_data: this.extractExtraFields(form),
      
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
      return 'unknown';
    }
    return orderId.substring(0, 2).toLowerCase();
  }

  /**
   * Get currency for country
   */
  private getCurrencyForCountry(country: string): string {
    const currencyMap: Record<string, string> = {
      'uk': 'GBP',
      'gb': 'GBP',
      'usa': 'USD',
      'us': 'USD',
      'canada': 'CAD',
      'ca': 'CAD',
      'india': 'INR',
      'in': 'INR',
      'israel': 'ILS',
      'il': 'ILS',
      'vietnam': 'VND',
      'vn': 'VND',
      'korea': 'KRW',
      'kr': 'KRW',
      'morocco': 'MAD',
      'ma': 'MAD',
      'saudi_arabia': 'SAR',
      'sa': 'SAR',
      'schengen': 'EUR',
      'eu': 'EUR',
    };
    return currencyMap[country?.toLowerCase()] || 'USD';
  }

  /**
   * Extract fields not in standard structure
   */
  private extractExtraFields(form: any): any {
    const standardFields = [
      'id', 'country', 'client', 'product', 'quantity', 'urgency',
      'discount', 'termsAgreed', 'orderId', 'meta', 'entry', 'business',
      'applicants', 'fileTransferMethod', 'emergencyContact'
    ];
    
    const extraFields: any = {
      termsAgreed: form.termsAgreed,
      orderId: form.orderId,
    };
    
    // Add any non-standard fields
    for (const key in form) {
      if (!standardFields.includes(key)) {
        extraFields[key] = form[key];
      }
    }
    
    return Object.keys(extraFields).length > 0 ? extraFields : null;
  }

  /**
   * Query orders with filters
   */
  async queryOrders(filters: {
    limit?: number;
    offset?: number;
    country?: string;
    status?: string;
    from_date?: string;
    to_date?: string;
  } = {}): Promise<any[]> {
    let query = this.supabaseService
      .client
      .from('orders')
      .select('*');
    
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
      .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 100) - 1);
    
    const { data, error } = await query;
    
    if (error) {
      this.logger.error('Failed to query orders', error);
      return [];
    }
    
    return data || [];
  }
}