import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { SupabaseService } from '@visapi/core-supabase';
import { Json } from '@visapi/shared-types';
import { Cacheable, CacheEvict } from '@visapi/backend-cache';

export interface OrderRecord {
  id: string;
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
  product_country: string;
  product_doc_type?: string;
  product_doc_name?: string;
  product_intent?: string;
  product_entries?: string;
  product_validity?: string;
  product_days_to_use?: number;
  product_data?: Json;
  
  // Visa details
  visa_quantity: number;
  file_transfer_method?: string;
  
  // Entry details
  entry_date?: string;
  entry_port?: string;
  visa_entries?: string;
  
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
  created_at: string;
  updated_at: string;
  whatsapp_confirmation_sent?: boolean;
  cbb_contact_id?: string;
  cbb_synced_at?: string;
}

export interface CreateOrderData {
  order_id: string;
  form_id: string;
  branch: string;
  domain: string;
  payment_processor: string;
  payment_id: string;
  amount: number;
  currency: string;
  order_status: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  whatsapp_alerts_enabled: boolean;
  product_country: string;
  product_data?: Json;
  visa_quantity: number;
  webhook_received_at: string;
  [key: string]: any; // Allow additional fields
}

export interface OrderFilters {
  branch?: string;
  order_status?: string;
  client_email?: string;
  client_phone?: string;
  whatsapp_alerts_enabled?: boolean;
  whatsapp_confirmation_sent?: boolean;
  cbb_synced_at?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class OrdersRepository extends BaseRepository<OrderRecord> {
  protected readonly tableName = 'orders';
  protected readonly logger = new Logger(OrdersRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {
    super(supabaseService.serviceClient);
  }

  /**
   * Find orders by client email
   */
  async findByClientEmail(email: string): Promise<OrderRecord[]> {
    return this.findMany({
      where: { client_email: email },
      orderBy: 'created_at',
      orderDirection: 'desc',
    });
  }

  /**
   * Find orders by client phone
   */
  async findByClientPhone(phone: string): Promise<OrderRecord[]> {
    return this.findMany({
      where: { client_phone: phone },
      orderBy: 'created_at',
      orderDirection: 'desc',
    });
  }

  /**
   * Find orders by branch
   */
  async findByBranch(
    branch: string,
    options?: { limit?: number; offset?: number },
  ): Promise<OrderRecord[]> {
    return this.findMany({
      where: { branch },
      orderBy: 'created_at',
      orderDirection: 'desc',
      ...options,
    });
  }

  /**
   * Find unprocessed orders
   */
  @Cacheable({ ttl: 30, key: 'orders:unprocessed' })
  async findUnprocessedOrders(limit = 100): Promise<OrderRecord[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .is('processed_at', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      this.logger.error('Error finding unprocessed orders', error);
      throw error;
    }

    return (data || []) as OrderRecord[];
  }

  /**
   * Find orders pending WhatsApp confirmation
   */
  @Cacheable({ ttl: 30, key: 'orders:whatsapp:pending' })
  async findPendingWhatsAppConfirmations(limit = 100): Promise<OrderRecord[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('whatsapp_alerts_enabled', true)
      .is('whatsapp_confirmation_sent', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      this.logger.error('Error finding pending WhatsApp confirmations', error);
      throw error;
    }

    return (data || []) as OrderRecord[];
  }

  /**
   * Find orders pending CBB sync
   */
  @Cacheable({ ttl: 30, key: 'orders:cbb:pending' })
  async findPendingCBBSync(limit = 100): Promise<OrderRecord[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .is('cbb_synced_at', null)
      .eq('branch', 'il')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      this.logger.error('Error finding pending CBB sync orders', error);
      throw error;
    }

    return (data || []) as OrderRecord[];
  }

  /**
   * Mark order as processed
   */
  @CacheEvict({ pattern: 'orders:*' }) // Evict all order caches
  async markAsProcessed(
    orderId: string,
    workflowId?: string,
    jobId?: string,
  ): Promise<OrderRecord> {
    return this.update(orderId, {
      processed_at: new Date().toISOString(),
      workflow_id: workflowId,
      job_id: jobId,
    });
  }

  /**
   * Mark WhatsApp confirmation as sent
   */
  @CacheEvict({ pattern: 'orders:whatsapp:*' })
  async markWhatsAppConfirmationSent(orderId: string): Promise<OrderRecord> {
    return this.update(orderId, {
      whatsapp_confirmation_sent: true,
    });
  }

  /**
   * Mark as synced with CBB
   */
  @CacheEvict({ pattern: 'orders:cbb:*' })
  async markCBBSynced(
    orderId: string,
    cbbContactId: string,
  ): Promise<OrderRecord> {
    return this.update(orderId, {
      cbb_contact_id: cbbContactId,
      cbb_synced_at: new Date().toISOString(),
    });
  }

  /**
   * Find orders with filters
   */
  async findWithFilters(filters: OrderFilters): Promise<OrderRecord[]> {
    let query = this.supabase.from(this.tableName).select('*');

    // Apply filters
    if (filters.branch) {
      query = query.eq('branch', filters.branch);
    }
    if (filters.order_status) {
      query = query.eq('order_status', filters.order_status);
    }
    if (filters.client_email) {
      query = query.eq('client_email', filters.client_email);
    }
    if (filters.client_phone) {
      query = query.eq('client_phone', filters.client_phone);
    }
    if (filters.whatsapp_alerts_enabled !== undefined) {
      query = query.eq('whatsapp_alerts_enabled', filters.whatsapp_alerts_enabled);
    }
    if (filters.whatsapp_confirmation_sent !== undefined) {
      if (filters.whatsapp_confirmation_sent) {
        query = query.eq('whatsapp_confirmation_sent', true);
      } else {
        query = query.is('whatsapp_confirmation_sent', null);
      }
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      this.logger.error('Error finding orders with filters', error);
      throw error;
    }

    return (data || []) as OrderRecord[];
  }

  /**
   * Get order statistics
   */
  @Cacheable({ ttl: 60, key: 'orders:stats' })
  async getStatistics(branch?: string): Promise<{
    total: number;
    processed: number;
    pending: number;
    whatsappSent: number;
    cbbSynced: number;
  }> {
    let baseQuery = this.supabase.from(this.tableName).select('*', {
      count: 'exact',
      head: true,
    });

    if (branch) {
      baseQuery = baseQuery.eq('branch', branch);
    }

    const [total, processed, whatsappSent, cbbSynced] = await Promise.all([
      baseQuery,
      this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .not('processed_at', 'is', null)
        .then((r) => r),
      this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('whatsapp_confirmation_sent', true)
        .then((r) => r),
      this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .not('cbb_synced_at', 'is', null)
        .then((r) => r),
    ]);

    return {
      total: total.count || 0,
      processed: processed.count || 0,
      pending: (total.count || 0) - (processed.count || 0),
      whatsappSent: whatsappSent.count || 0,
      cbbSynced: cbbSynced.count || 0,
    };
  }

  /**
   * Bulk update orders
   */
  @CacheEvict({ pattern: 'orders:*' }) // Evict all order caches on bulk update
  async bulkUpdate(
    orderIds: string[],
    data: Partial<OrderRecord>,
  ): Promise<OrderRecord[]> {
    const { data: updated, error } = await this.supabase
      .from(this.tableName)
      .update(data)
      .in('id', orderIds)
      .select();

    if (error) {
      this.logger.error('Error bulk updating orders', error);
      throw error;
    }

    return (updated || []) as OrderRecord[];
  }
}