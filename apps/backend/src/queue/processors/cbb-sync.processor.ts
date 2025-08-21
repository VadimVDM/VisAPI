import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CbbClientService } from '@visapi/backend-core-cbb';
import { CBBContactData, CBBContactSyncResult } from '@visapi/shared-types';
import { SupabaseService } from '@visapi/core-supabase';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

interface CBBSyncJobData {
  orderId: string;
}

interface OrderData {
  order_id: string;
  client_phone: string;
  client_name: string;
  client_email: string;
  product_country: string;
  product_doc_type: string;
  visa_quantity: number;
  urgency: string;
  amount: number;
  currency: string;
  entry_date: string;
  branch: string;
  form_id: string;
  webhook_received_at: string;
  whatsapp_alerts_enabled: boolean;
  cbb_sync_status: string;
  cbb_sync_attempted_at?: string;
  cbb_sync_completed_at?: string;
  cbb_sync_error?: string;
  cbb_contact_exists?: boolean;
  cbb_has_whatsapp?: boolean;
  cbb_contact_id?: string;
}

@Injectable()
@Processor('cbb-sync')
export class CBBSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(CBBSyncProcessor.name);

  constructor(
    private readonly cbbService: CbbClientService,
    private readonly supabaseService: SupabaseService,
    @InjectMetric('cbb_sync_total') private readonly syncTotalCounter: Counter<string>,
    @InjectMetric('cbb_sync_success') private readonly syncSuccessCounter: Counter<string>,
    @InjectMetric('cbb_sync_failures') private readonly syncFailureCounter: Counter<string>,
    @InjectMetric('cbb_sync_duration') private readonly syncDurationHistogram: Histogram<string>,
    @InjectMetric('cbb_contacts_created') private readonly contactsCreatedCounter: Counter<string>,
    @InjectMetric('cbb_contacts_updated') private readonly contactsUpdatedCounter: Counter<string>,
    @InjectMetric('cbb_whatsapp_available') private readonly whatsappAvailableCounter: Counter<string>,
    @InjectMetric('cbb_whatsapp_unavailable') private readonly whatsappUnavailableCounter: Counter<string>,
  ) {
    super();
  }

  async process(job: Job<CBBSyncJobData>): Promise<CBBContactSyncResult> {
    const { orderId } = job.data;
    const startTime = Date.now();

    this.logger.log(`Starting CBB contact sync for order: ${orderId}`);
    this.syncTotalCounter.inc();

    try {
      // 1. Fetch order details
      const order = await this.getOrderByOrderId(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // 2. Check if already synced
      if (order.cbb_sync_status === 'synced') {
        this.logger.log(`Order ${orderId} already synced`);
        return { 
          status: 'success', 
          action: 'skipped',
          contactId: order.cbb_contact_id,
        };
      }

      // 3. Mark as syncing
      await this.updateCBBSyncStatus(orderId, 'syncing');

      // 4. Prepare contact data
      const contactData = this.prepareContactData(order);

      // 5. Check if contact exists
      let contact = await this.cbbService.getContactById(order.client_phone);
      let isNewContact = false;

      if (contact) {
        // Update existing contact
        contact = await this.cbbService.updateContactFields(
          order.client_phone,
          contactData.cufs
        );
        this.logger.log(`Updated CBB contact for order ${orderId}`);
        this.contactsUpdatedCounter.inc();
      } else {
        // Create new contact
        contact = await this.cbbService.createContactWithFields(contactData);
        isNewContact = true;
        this.logger.log(`Created new CBB contact for order ${orderId}`);
        this.contactsCreatedCounter.inc();
      }

      // 6. Validate WhatsApp
      const hasWhatsApp = await this.cbbService.validateWhatsApp(order.client_phone);
      
      if (hasWhatsApp) {
        this.whatsappAvailableCounter.inc();
      } else {
        this.whatsappUnavailableCounter.inc();
      }

      // 7. Update order with results
      await this.updateCBBSyncResult(orderId, {
        cbb_contact_id: contact.id,
        cbb_sync_status: hasWhatsApp ? 'synced' : 'no_whatsapp',
        cbb_contact_exists: !isNewContact,
        cbb_has_whatsapp: hasWhatsApp,
        cbb_sync_completed_at: new Date().toISOString(),
      });

      // 8. Log success
      this.logger.log(`CBB contact sync successful for order ${orderId}`, {
        contact_id: contact.id,
        action: isNewContact ? 'created' : 'updated',
        has_whatsapp: hasWhatsApp,
      });

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      this.syncDurationHistogram.observe(duration);
      this.syncSuccessCounter.inc();

      return {
        status: hasWhatsApp ? 'success' : 'no_whatsapp',
        action: isNewContact ? 'created' : 'updated',
        contactId: contact.id,
        hasWhatsApp,
      };

    } catch (error) {
      // Handle errors
      await this.handleSyncError(orderId, error);
      this.syncFailureCounter.inc();
      
      const duration = (Date.now() - startTime) / 1000;
      this.syncDurationHistogram.observe(duration);
      
      throw error;
    }
  }

  private prepareContactData(order: OrderData): CBBContactData {
    return {
      id: order.client_phone,
      phone: order.client_phone,
      name: order.client_name,
      email: order.client_email,
      cufs: {
        Email: order.client_email,
        OrderNumber: order.order_id,
        customer_name: order.client_name,
        order_urgent: order.urgency === 'urgent' || order.urgency === 'express', // Boolean based on urgency
        visa_country: order.product_country,
        visa_quantity: order.visa_quantity,
        visa_type: order.product_doc_type || 'tourist',
      },
    };
  }

  private async handleSyncError(orderId: string, error: any) {
    const errorMessage = error.message || 'Unknown error';
    
    await this.updateCBBSyncResult(orderId, {
      cbb_sync_status: 'failed',
      cbb_sync_error: errorMessage,
      cbb_sync_attempted_at: new Date().toISOString(),
    });

    this.logger.error(`CBB contact sync failed for order ${orderId}`, {
      error: errorMessage,
      stack: error.stack,
    });
  }

  private async getOrderByOrderId(orderId: string): Promise<OrderData | null> {
    const { data, error } = await this.supabaseService.client
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch order ${orderId}:`, error);
      return null;
    }

    return data;
  }

  private async updateCBBSyncStatus(orderId: string, status: string) {
    const { error } = await this.supabaseService.client
      .from('orders')
      .update({ 
        cbb_sync_status: status,
        cbb_sync_attempted_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    if (error) {
      this.logger.error(`Failed to update sync status for order ${orderId}:`, error);
      throw error;
    }
  }

  private async updateCBBSyncResult(orderId: string, updates: Partial<OrderData>) {
    const { error } = await this.supabaseService.client
      .from('orders')
      .update(updates)
      .eq('order_id', orderId);

    if (error) {
      this.logger.error(`Failed to update sync result for order ${orderId}:`, error);
      throw error;
    }
  }
}