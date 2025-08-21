# CGB WhatsApp Contact Synchronization Flow

## Executive Summary

This document outlines the comprehensive implementation plan for an automated flow that synchronizes Vizi order data with ChatGPT Builder (CGB) WhatsApp contacts. The system will trigger after each order is saved to the database, ensuring all customer contact information and order details are properly synced with the WhatsApp Business API platform.

**Core Objective**: Automatically create or update WhatsApp contacts in CGB when orders are received, enabling seamless WhatsApp communication with customers about their visa applications.

---

## System Architecture Overview

```
┌─────────────────┐
│  Vizi Webhook   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│  Orders Table   │────▶│ Event Emitter │
│   (INSERT)      │     └──────┬───────┘
└─────────────────┘            │
                               ▼
                     ┌─────────────────┐
                     │  BullMQ Queue   │
                     │ cgb-contact-sync│
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ CGB Sync Worker │
                     └────────┬────────┘
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
         ┌──────────────┐          ┌──────────────┐
         │ GET Contact  │          │ POST Contact │
         │   (exists)   │          │  (not exists) │
         └──────┬───────┘          └──────┬───────┘
                │                          │
                ▼                          ▼
         ┌──────────────┐          ┌──────────────┐
         │PATCH Contact │          │  Log Success  │
         │ Update CUFs  │          │   (created)   │
         └──────┬───────┘          └──────────────┘
                │
                ▼
         ┌──────────────┐
         │  Log Success  │
         │   (updated)   │
         └──────────────┘
```

---

## Technical Requirements

### 1. CGB API Integration Details

**Base URL**: `https://app.chatgptbuilder.io/api/`
**Documentation**: https://app.chatgptbuilder.io/api/swagger/
**Authentication**: Bearer token (API Key from environment)

#### Key Endpoints:
- `GET /contacts/{id}` - Check if contact exists
- `POST /contacts` - Create new contact
- `PATCH /contacts/{id}` - Update existing contact
- `GET /contacts/{id}/validate-whatsapp` - Check WhatsApp availability

### 2. Phone Number Format Requirements

**Our Format**: `447700900123` (no spaces, no plus)
**CGB Format**: Identical - uses phone as ID
**Mapping**: `orders.client_phone` → `cgb.contact.id`

### 3. Data Field Mappings

| Order Field | CGB Field | Type | Description |
|------------|-----------|------|-------------|
| client_phone | id & phone | string | Primary identifier |
| client_name | cufs.name | string | Customer full name |
| client_email | cufs.email | string | Email address |
| product_country | cufs.visa_country | string | Destination country |
| product_doc_type | cufs.visa_type | string | Visa type (tourist/business/etc) |
| visa_quantity | cufs.visa_quantity | number | Number of visas |
| urgency | cufs.urgency | string | Processing speed |
| amount + currency | cufs.total_paid | string | e.g., "150.00 GBP" |
| order_id | cufs.order_id | string | Reference to our order |
| entry_date | cufs.entry_date | string | Planned travel date |
| branch | cufs.branch | string | Processing branch |

---

## Implementation Plan

### Phase 1: Database Schema Updates

```sql
-- Add CGB sync tracking columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cgb_contact_id VARCHAR(20);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cgb_sync_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cgb_sync_attempted_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cgb_sync_completed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cgb_sync_error TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cgb_contact_exists BOOLEAN;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cgb_has_whatsapp BOOLEAN;

-- Add indexes for performance
CREATE INDEX idx_orders_cgb_sync_status ON orders(cgb_sync_status);
CREATE INDEX idx_orders_cgb_contact_id ON orders(cgb_contact_id);

-- Add check constraint for sync status
ALTER TABLE public.orders ADD CONSTRAINT check_cgb_sync_status 
  CHECK (cgb_sync_status IN ('pending', 'syncing', 'synced', 'failed', 'no_whatsapp', 'skipped'));
```

### Phase 2: CGB Service Enhancement

#### 2.1 Core Service Methods

```typescript
// libs/backend/core-cgb/src/lib/cgb.service.ts

interface ContactData {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  cufs: Record<string, any>;
}

interface CGBContact {
  id: string;
  phone: string;
  name: string;
  email: string;
  hasWhatsApp: boolean;
  customFields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

class CGBService {
  /**
   * Search for a contact by ID (phone number)
   */
  async getContactById(id: string): Promise<CGBContact | null> {
    try {
      const response = await this.api.get(`/contacts/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new contact
   */
  async createContact(data: ContactData): Promise<CGBContact> {
    const response = await this.api.post('/contacts', {
      id: data.id,
      phone: data.phone,
      name: data.name,
      email: data.email,
      customFields: data.cufs,
    });
    return response.data;
  }

  /**
   * Update contact custom fields
   */
  async updateContactFields(id: string, cufs: Record<string, any>): Promise<CGBContact> {
    const response = await this.api.patch(`/contacts/${id}`, {
      customFields: cufs,
    });
    return response.data;
  }

  /**
   * Check if phone has WhatsApp
   */
  async validateWhatsApp(phone: string): Promise<boolean> {
    try {
      const response = await this.api.get(`/contacts/${phone}/validate-whatsapp`);
      return response.data.hasWhatsApp;
    } catch {
      return false;
    }
  }
}
```

### Phase 3: Queue Job Implementation

#### 3.1 Queue Configuration

```typescript
// apps/backend/src/queue/processors/cgb-sync.processor.ts

@Processor('cgb-sync')
export class CGBSyncProcessor {
  private readonly logger = new Logger(CGBSyncProcessor.name);

  constructor(
    private readonly cgbService: CGBService,
    private readonly ordersService: OrdersService,
    private readonly logService: LogService,
  ) {}

  @Process('sync-contact')
  async handleContactSync(job: Job<{ orderId: string }>) {
    const { orderId } = job.data;
    
    try {
      // 1. Fetch order details
      const order = await this.ordersService.getOrderByOrderId(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // 2. Check if already synced
      if (order.cgb_sync_status === 'synced') {
        this.logger.log(`Order ${orderId} already synced`);
        return { status: 'already_synced' };
      }

      // 3. Mark as syncing
      await this.ordersService.updateCGBSyncStatus(orderId, 'syncing');

      // 4. Prepare contact data
      const contactData = this.prepareContactData(order);

      // 5. Check if contact exists
      let contact = await this.cgbService.getContactById(order.client_phone);
      let isNewContact = false;

      if (contact) {
        // Update existing contact
        contact = await this.cgbService.updateContactFields(
          order.client_phone,
          contactData.cufs
        );
        this.logger.log(`Updated CGB contact for ${orderId}`);
      } else {
        // Create new contact
        contact = await this.cgbService.createContact(contactData);
        isNewContact = true;
        this.logger.log(`Created new CGB contact for ${orderId}`);
      }

      // 6. Validate WhatsApp
      const hasWhatsApp = await this.cgbService.validateWhatsApp(order.client_phone);

      // 7. Update order with results
      await this.ordersService.updateCGBSyncResult(orderId, {
        cgb_contact_id: contact.id,
        cgb_sync_status: hasWhatsApp ? 'synced' : 'no_whatsapp',
        cgb_contact_exists: !isNewContact,
        cgb_has_whatsapp: hasWhatsApp,
        cgb_sync_completed_at: new Date(),
      });

      // 8. Log success
      await this.logService.createLog({
        level: 'info',
        message: `CGB contact sync successful`,
        metadata: {
          order_id: orderId,
          contact_id: contact.id,
          action: isNewContact ? 'created' : 'updated',
          has_whatsapp: hasWhatsApp,
        },
      });

      return {
        status: 'success',
        action: isNewContact ? 'created' : 'updated',
        contactId: contact.id,
        hasWhatsApp,
      };

    } catch (error) {
      // Handle errors
      await this.handleSyncError(orderId, error);
      throw error;
    }
  }

  private prepareContactData(order: any): ContactData {
    return {
      id: order.client_phone,
      phone: order.client_phone,
      name: order.client_name,
      email: order.client_email,
      cufs: {
        name: order.client_name,
        email: order.client_email,
        visa_country: order.product_country,
        visa_type: order.product_doc_type || 'tourist',
        visa_quantity: order.visa_quantity,
        urgency: order.urgency,
        total_paid: `${order.amount} ${order.currency}`,
        order_id: order.order_id,
        entry_date: order.entry_date,
        branch: order.branch,
        form_id: order.form_id,
        order_date: order.webhook_received_at,
      },
    };
  }

  private async handleSyncError(orderId: string, error: any) {
    const errorMessage = error.message || 'Unknown error';
    
    await this.ordersService.updateCGBSyncResult(orderId, {
      cgb_sync_status: 'failed',
      cgb_sync_error: errorMessage,
      cgb_sync_attempted_at: new Date(),
    });

    await this.logService.createLog({
      level: 'error',
      message: 'CGB contact sync failed',
      metadata: {
        order_id: orderId,
        error: errorMessage,
        stack: error.stack,
      },
    });
  }
}
```

### Phase 4: Trigger Mechanism

#### 4.1 Order Creation Hook

```typescript
// apps/backend/src/orders/orders.service.ts

async createOrder(webhookData: ViziWebhookDto): Promise<string> {
  // ... existing order creation logic ...
  
  const orderId = await this.saveOrderToDatabase(orderData);
  
  // Trigger CGB sync if WhatsApp alerts enabled
  if (orderData.whatsapp_alerts_enabled) {
    await this.queueService.addJob('cgb-sync', 'sync-contact', {
      orderId: orderData.order_id,
    }, {
      delay: 2000, // 2 second delay to ensure order is committed
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
  
  return orderId;
}
```

### Phase 5: Monitoring & Observability

#### 5.1 Metrics to Track

```typescript
// Prometheus metrics
cgb_sync_total: Counter - Total sync attempts
cgb_sync_success: Counter - Successful syncs
cgb_sync_failures: Counter - Failed syncs
cgb_sync_duration: Histogram - Sync operation duration
cgb_contacts_created: Counter - New contacts created
cgb_contacts_updated: Counter - Existing contacts updated
cgb_whatsapp_available: Counter - Contacts with WhatsApp
cgb_whatsapp_unavailable: Counter - Contacts without WhatsApp
```

#### 5.2 Monitoring Queries

```sql
-- Daily sync statistics
SELECT 
  DATE(cgb_sync_completed_at) as date,
  COUNT(*) as total_syncs,
  COUNT(CASE WHEN cgb_sync_status = 'synced' THEN 1 END) as successful,
  COUNT(CASE WHEN cgb_sync_status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN cgb_sync_status = 'no_whatsapp' THEN 1 END) as no_whatsapp,
  COUNT(CASE WHEN cgb_contact_exists = false THEN 1 END) as new_contacts,
  COUNT(CASE WHEN cgb_contact_exists = true THEN 1 END) as updated_contacts,
  ROUND(AVG(EXTRACT(EPOCH FROM (cgb_sync_completed_at - cgb_sync_attempted_at))), 2) as avg_sync_seconds
FROM orders
WHERE cgb_sync_attempted_at IS NOT NULL
GROUP BY DATE(cgb_sync_completed_at)
ORDER BY date DESC;

-- Failed sync analysis
SELECT 
  cgb_sync_error,
  COUNT(*) as occurrences,
  MAX(cgb_sync_attempted_at) as last_occurrence
FROM orders
WHERE cgb_sync_status = 'failed'
GROUP BY cgb_sync_error
ORDER BY occurrences DESC;

-- WhatsApp availability by country
SELECT 
  product_country,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN cgb_has_whatsapp = true THEN 1 END) as has_whatsapp,
  ROUND(COUNT(CASE WHEN cgb_has_whatsapp = true THEN 1 END)::numeric / COUNT(*) * 100, 1) as whatsapp_percentage
FROM orders
WHERE cgb_sync_attempted_at IS NOT NULL
GROUP BY product_country
ORDER BY total_orders DESC;
```

---

## Error Handling & Recovery

### Common Error Scenarios

1. **Contact Has No WhatsApp**
   - Status: `no_whatsapp`
   - Action: Mark as synced but flag for alternative communication
   - Recovery: Send email instead

2. **API Rate Limit Exceeded**
   - Status: `failed`
   - Error: "Rate limit exceeded"
   - Recovery: Exponential backoff retry

3. **Invalid Phone Format**
   - Status: `failed`
   - Error: "Invalid phone number format"
   - Recovery: Manual review queue

4. **CGB Service Unavailable**
   - Status: `failed`
   - Error: "Service unavailable"
   - Recovery: Retry with longer delays

5. **Duplicate Contact ID**
   - Status: `failed`
   - Error: "Contact already exists"
   - Recovery: Force update existing

### Retry Strategy

```typescript
const retryConfig = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // Start with 5 seconds
    maxDelay: 60000, // Max 1 minute
  },
  removeOnComplete: true,
  removeOnFail: false, // Keep for debugging
};
```

### Manual Recovery Commands

```bash
# Retry all failed syncs
npm run cgb:retry-failed

# Sync specific order
npm run cgb:sync-order -- --order-id="IL250819GB16"

# Bulk sync date range
npm run cgb:bulk-sync -- --from="2025-08-01" --to="2025-08-20"

# Validate all WhatsApp numbers
npm run cgb:validate-whatsapp
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('CGBSyncProcessor', () => {
  it('should create new contact when not exists');
  it('should update existing contact');
  it('should handle missing WhatsApp');
  it('should retry on API failure');
  it('should validate phone format');
  it('should map order fields correctly');
});
```

### Integration Tests

```typescript
describe('CGB API Integration', () => {
  it('should authenticate with API');
  it('should handle rate limiting');
  it('should create contact with all fields');
  it('should update contact fields');
  it('should validate WhatsApp status');
});
```

### E2E Tests

```typescript
describe('Order to CGB Sync Flow', () => {
  it('should sync order after webhook receipt');
  it('should update existing contact on duplicate order');
  it('should handle bulk order processing');
  it('should recover from failures');
});
```

---

## Rollout Plan

### Phase 1: Development (Week 1)
- [ ] Database schema updates
- [ ] CGB service implementation
- [ ] Queue processor development
- [ ] Unit tests

### Phase 2: Testing (Week 2)
- [ ] Integration testing with CGB sandbox
- [ ] Load testing with 100+ orders
- [ ] Error scenario testing
- [ ] Performance optimization

### Phase 3: Staging Deployment (Week 3)
- [ ] Deploy with feature flag OFF
- [ ] Manual testing with test orders
- [ ] Monitor API usage and limits
- [ ] Verify data accuracy

### Phase 4: Production Rollout (Week 4)
- [ ] Enable for 10% of orders (canary)
- [ ] Monitor metrics for 24 hours
- [ ] Gradual rollout to 100%
- [ ] Full production monitoring

---

## Success Metrics

### Key Performance Indicators (KPIs)

1. **Sync Success Rate**: Target > 95%
2. **Average Sync Time**: Target < 5 seconds
3. **WhatsApp Availability**: Track percentage
4. **API Error Rate**: Target < 1%
5. **Queue Processing Time**: Target < 10 seconds
6. **Contact Creation vs Update Ratio**: Monitor trends

### Monitoring Dashboard

Create Grafana dashboard with:
- Real-time sync status
- Success/failure rates
- API response times
- Queue depth and processing rate
- WhatsApp availability by country
- Error distribution

---

## Security Considerations

1. **API Key Management**
   - Store in environment variables
   - Rotate quarterly
   - Never log in plain text

2. **Phone Number Privacy**
   - Mask in logs (e.g., 447700***123)
   - Encrypt at rest
   - Audit all access

3. **Data Compliance**
   - GDPR compliance for EU customers
   - Data retention policies
   - Right to deletion support

4. **Rate Limiting**
   - Implement client-side throttling
   - Respect API limits
   - Circuit breaker pattern

---

## Configuration

### Environment Variables

```bash
# CGB API Configuration
CGB_API_URL=https://app.chatgptbuilder.io/api
CGB_API_KEY=your_api_key_here
CGB_API_TIMEOUT=30000
CGB_API_RETRY_ATTEMPTS=3

# Feature Flags
ENABLE_CGB_SYNC=true
CGB_SYNC_DRY_RUN=false
CGB_SYNC_BATCH_SIZE=10
CGB_SYNC_CONCURRENCY=5

# Monitoring
CGB_SYNC_ALERT_THRESHOLD=0.90
CGB_SYNC_ALERT_EMAIL=ops@visanet.app
```

---

## Maintenance & Operations

### Daily Operations

1. **Morning Check** (9 AM)
   - Review overnight sync failures
   - Check queue depth
   - Verify API health

2. **Afternoon Review** (3 PM)
   - Analyze sync patterns
   - Review error logs
   - Update contact metrics

3. **End of Day** (6 PM)
   - Generate daily report
   - Queue cleanup
   - Prepare for overnight processing

### Weekly Tasks

- Review sync performance metrics
- Analyze WhatsApp availability trends
- Update failed contact list
- API usage audit
- Performance optimization review

### Monthly Tasks

- Full system audit
- API key rotation
- Database cleanup
- Performance benchmarking
- Cost analysis

---

## Appendix

### A. CGB API Response Examples

```json
// GET /contacts/{id} - Success
{
  "id": "447700900123",
  "phone": "447700900123",
  "name": "John Doe",
  "email": "john@example.com",
  "hasWhatsApp": true,
  "customFields": {
    "visa_country": "uk",
    "visa_type": "tourist",
    "visa_quantity": 1
  },
  "createdAt": "2025-08-20T10:00:00Z",
  "updatedAt": "2025-08-20T10:00:00Z"
}

// POST /contacts - Create
{
  "id": "447700900123",
  "phone": "447700900123",
  "name": "John Doe",
  "email": "john@example.com",
  "customFields": {
    "visa_country": "uk",
    "visa_type": "tourist"
  }
}
```

### B. Database Query Examples

```sql
-- Find orders pending sync
SELECT order_id, client_phone, product_country
FROM orders
WHERE cgb_sync_status = 'pending'
  AND whatsapp_alerts_enabled = true
ORDER BY webhook_received_at
LIMIT 100;

-- Retry failed syncs
UPDATE orders
SET cgb_sync_status = 'pending',
    cgb_sync_error = NULL
WHERE cgb_sync_status = 'failed'
  AND cgb_sync_attempted_at < NOW() - INTERVAL '1 hour';
```

### C. Troubleshooting Guide

| Issue | Symptoms | Solution |
|-------|----------|----------|
| High failure rate | >5% sync failures | Check API limits, validate phone formats |
| Slow sync | >10 seconds average | Optimize API calls, check network |
| Duplicate contacts | Multiple IDs same phone | Implement deduplication logic |
| Missing fields | CUFs not updating | Verify field mappings, check API schema |
| Queue backup | >1000 pending jobs | Scale workers, check for blocking |

---

## Conclusion

This CGB WhatsApp Contact Synchronization Flow provides a robust, scalable solution for automatically managing WhatsApp contacts based on incoming orders. The system is designed with reliability, performance, and observability in mind, ensuring smooth operations and easy troubleshooting.

**Next Steps**:
1. Review and approve this plan
2. Set up CGB API access
3. Begin Phase 1 implementation
4. Schedule testing timeline

---

**Document Version**: 1.0
**Last Updated**: August 20, 2025
**Author**: VisAPI Development Team
**Status**: DRAFT - Awaiting Approval