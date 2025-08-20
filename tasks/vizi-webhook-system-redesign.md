# Vizi Webhook System Redesign - Comprehensive Implementation Plan

**Created:** July 31, 2025  
**Status:** Planning Phase  
**Priority:** CRITICAL - Current system is fundamentally flawed

## Problem Analysis

### Current System Issues
1. **Country-Specific Workflows**: Service requires separate workflows per country (`vizi_india`, `vizi_thailand`, etc.) - NOT SCALABLE
2. **Data Loss**: Webhook data is only stored if matching workflow exists - CRITICAL FLAW
3. **Unused Infrastructure**: `webhook_data` table exists but is completely ignored
4. **Business Logic Mismatch**: System doesn't understand Visanet processes multiple countries with similar workflows

### Root Cause
The current `vizi-webhooks.service.ts` was designed with the wrong assumption that each country needs separate workflow matching. This breaks the entire data flow.

## Proposed Architecture

### Data Storage Strategy
**Two-tier storage approach:**
1. **Structured Columns** - Most important fields for queries/reporting
2. **Full JSON Column** - Complete webhook payload for comprehensive data access

### Key Structured Fields
Based on the provided example data:

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `order_id` | VARCHAR(50) | Primary order identifier | "IL250731IN8" |
| `form_id` | VARCHAR(50) | Form identifier | "frm_kiAC4FcizlCC" |
| `client_email` | VARCHAR(255) | Client contact | "aharon.anat@gmail.com" |
| `client_name` | VARCHAR(255) | Client name | "ענת אהרון" |
| `client_phone` | VARCHAR(50) | Client phone | "+972-0546665754" |
| `visa_country` | VARCHAR(50) | Destination country | "india" |
| `visa_type` | VARCHAR(100) | Product name | "india_tourist_year" |
| `urgency` | VARCHAR(50) | Processing priority | "none", "next_day" |
| `quantity` | INTEGER | Number of applicants | 1 |
| `entry_date` | DATE | Planned entry date | "2025-08-20" |
| `order_date` | TIMESTAMP | When order was created | "2025-07-31T14:27:12.845Z" |
| `payment_amount` | DECIMAL(10,2) | Payment amount | 249.00 |
| `payment_currency` | VARCHAR(3) | Currency code | "ILS" |
| `branch` | VARCHAR(10) | Branch code | "il" |
| `domain` | VARCHAR(100) | Source domain | "visanet.co.il" |
| `passport_data` | JSONB | Passport information | {"nationality": "ISR", "firstName": "anat", ...} |
| `payment_data` | JSONB | Payment details | {"processor": "bit", "payment_id": "1075-6375-00588", ...} |
| `product_data` | JSONB | Complete product info | {"name": "india_tourist_year", "docType": "evisa", ...} |
| `full_payload` | JSONB | Complete webhook data | {entire webhook payload} |

## Implementation Plan

### Phase 1: Database Schema Enhancement (Priority: CRITICAL)

#### Task 1.1: Update webhook_data Table Schema
```sql
-- Add structured columns to existing webhook_data table
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS order_id VARCHAR(50);
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS form_id VARCHAR(50);
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS client_email VARCHAR(255);
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50);
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS visa_country VARCHAR(50);
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS visa_type VARCHAR(100);
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS urgency VARCHAR(50);
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS entry_date DATE;
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS order_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2);
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(3);
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS branch VARCHAR(10);
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS domain VARCHAR(100);
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS passport_data JSONB;
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS payment_data JSONB;
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS product_data JSONB;
ALTER TABLE webhook_data ADD COLUMN IF NOT EXISTS full_payload JSONB;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_webhook_data_order_id ON webhook_data(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_data_client_email ON webhook_data(client_email);
CREATE INDEX IF NOT EXISTS idx_webhook_data_visa_country ON webhook_data(visa_country);
CREATE INDEX IF NOT EXISTS idx_webhook_data_order_date ON webhook_data(order_date);
CREATE INDEX IF NOT EXISTS idx_webhook_data_branch ON webhook_data(branch);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_webhook_data_country_date ON webhook_data(visa_country, order_date);
CREATE INDEX IF NOT EXISTS idx_webhook_data_branch_date ON webhook_data(branch, order_date);
```

#### Task 1.2: Create Data Extraction Functions
Create utility functions to extract structured data from the webhook payload:

```typescript
// libs/shared/visanet-types/src/lib/webhook-extractors.ts
export interface ExtractedWebhookData {
  order_id: string;
  form_id: string;
  client_email: string;
  client_name: string;
  client_phone: string;
  visa_country: string;
  visa_type: string;
  urgency: string;
  quantity: number;
  entry_date: string | null;
  order_date: string;
  payment_amount: number;
  payment_currency: string;
  branch: string;
  domain: string;
  passport_data: any;
  payment_data: any;
  product_data: any;
  full_payload: any;
}

export function extractWebhookData(payload: ViziWebhookDto): ExtractedWebhookData {
  const { form, order } = payload;
  
  return {
    order_id: order.id,
    form_id: order.form_id,
    client_email: form.client.email,
    client_name: form.client.name,
    client_phone: `${form.client.phone.code}-${form.client.phone.number}`,
    visa_country: form.country,
    visa_type: form.product.name,
    urgency: form.urgency,
    quantity: form.quantity,
    entry_date: form.entry?.date || null,
    order_date: form.created_at || new Date().toISOString(),
    payment_amount: order.amount,
    payment_currency: order.currency,
    branch: order.branch,
    domain: order.domain,
    passport_data: form.applicants?.[0]?.passport || null,
    payment_data: {
      processor: order.payment_processor,
      payment_id: order.payment_id,
      coupon: order.coupon,
      status: order.status
    },
    product_data: form.product,
    full_payload: payload
  };
}
```

### Phase 2: Service Layer Redesign (Priority: CRITICAL)

#### Task 2.1: Create WebhookDataService
Create a dedicated service for webhook data management:

```typescript
// apps/backend/src/webhook-data/webhook-data.service.ts
@Injectable()
export class WebhookDataService {
  async storeWebhookData(
    extractedData: ExtractedWebhookData,
    correlationId?: string
  ): Promise<string> {
    // ALWAYS store webhook data first, regardless of workflow matching
    const { data, error } = await this.supabaseService.getClient()
      .from('webhook_data')
      .insert({
        ...extractedData,
        correlation_id: correlationId,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to store webhook data: ${error.message}`);
    return data.id;
  }

  async getWebhookData(filters: WebhookDataFilters): Promise<PaginatedWebhookData> {
    // Implementation for querying webhook data with filters
  }
}
```

#### Task 2.2: Redesign ViziWebhooksService
Completely rewrite the service with proper separation of concerns:

```typescript
// apps/backend/src/vizi-webhooks/vizi-webhooks.service.ts
@Injectable()
export class ViziWebhooksService {
  async processViziOrder(
    webhookData: ViziWebhookDto,
    correlationId?: string,
  ): Promise<{
    webhookDataId: string;
    workflowId: string | null;
    jobId: string | null;
    status: string;
  }> {
    // STEP 1: ALWAYS extract and store webhook data first
    const extractedData = extractWebhookData(webhookData);
    const webhookDataId = await this.webhookDataService.storeWebhookData(
      extractedData, 
      correlationId
    );

    // STEP 2: Log successful data storage
    await this.logService.createLog({
      level: 'info',
      message: 'Vizi webhook data stored successfully',
      metadata: {
        webkit_data_id: webhookDataId,
        source: 'webhook',
        country: extractedData.visa_country,
        order_id: extractedData.order_id,
        correlationId,
      },
      correlation_id: correlationId,
    });

    // STEP 3: Find matching workflow (COUNTRY-AGNOSTIC)
    const workflow = await this.findMatchingWorkflow(extractedData);

    if (!workflow) {
      return {
        webhookDataId,
        workflowId: null,
        jobId: null,
        status: 'stored_no_workflow',
      };
    }

    // STEP 4: Queue workflow processing
    const job = await this.queueWorkflowProcessing(workflow, extractedData, webhookDataId);

    return {
      webhookDataId,
      workflowId: workflow.id,
      jobId: job.id,
      status: 'stored_and_queued',
    };
  }

  private async findMatchingWorkflow(data: ExtractedWebhookData): Promise<Workflow | null> {
    // Find GENERIC Vizi workflows, not country-specific ones
    const workflows = await this.workflowsService.findAll();
    
    return workflows.find(w => 
      w.enabled && 
      w.schema?.triggers?.some(t => 
        t.type === 'webhook' && 
        (t.config?.key === 'vizi' || t.config?.source === 'vizi') // Generic matching
      )
    ) || null;
  }
}
```

### Phase 3: Workflow System Enhancement (Priority: HIGH)

#### Task 3.1: Create Generic Vizi Workflow
Replace country-specific workflows with a single, flexible workflow:

```json
{
  "name": "Vizi Visa Processing Workflow",
  "description": "Generic workflow for processing visa orders from Vizi webhooks",
  "enabled": true,
  "triggers": [
    {
      "type": "webhook",
      "config": {
        "key": "vizi",
        "source": "vizi",
        "description": "Handles all Vizi webhook data regardless of country"
      }
    }
  ],
  "steps": [
    {
      "id": "notify-team",
      "type": "slack.send",
      "config": {
        "channel": "#visa-orders",
        "template": "vizi_order_received",
        "variables": {
          "order_id": "{{webhook.order_id}}",
          "client_name": "{{webhook.client_name}}",
          "visa_country": "{{webhook.visa_country}}",
          "visa_type": "{{webhook.visa_type}}",
          "urgency": "{{webhook.urgency}}",
          "amount": "{{webhook.payment_amount}}",
          "currency": "{{webhook.payment_currency}}"
        }
      },
      "retries": 3
    },
    {
      "id": "notify-client",
      "type": "whatsapp.send",
      "config": {
        "contact": "{{webhook.client_phone}}",
        "template": "order_confirmation",
        "variables": {
          "client_name": "{{webhook.client_name}}",
          "order_id": "{{webhook.order_id}}",
          "visa_country": "{{webhook.visa_country}}",
          "entry_date": "{{webhook.entry_date}}"
        }
      },
      "retries": 3
    }
  ]
}
```

#### Task 3.2: Update Workflow Context System
Enhance the workflow execution context to include webhook data:

```typescript
// Update webhook context to use extracted data
const webhookContext = {
  webhook: extractedData, // All structured data available as {{webhook.field_name}}
  raw: webhookData,       // Full payload available as {{raw.form.field}}
  metadata: {
    webhook_data_id: webhookDataId,
    source: 'vizi_webhook',
    timestamp: new Date().toISOString(),
    correlationId,
  }
};
```

### Phase 4: API Enhancement (Priority: MEDIUM)

#### Task 4.1: Create Webhook Data API Endpoints
Add endpoints for accessing stored webhook data:

```typescript
// apps/backend/src/webhook-data/webhook-data.controller.ts
@Controller('v1/webhook-data')
export class WebhookDataController {
  @Get()
  @Scopes('webhook:read', 'logs:read')
  async getWebhookData(@Query() filters: WebhookDataFiltersDto) {
    return this.webhookDataService.getWebhookData(filters);
  }

  @Get(':id')
  @Scopes('webhook:read', 'logs:read')
  async getWebhookDataById(@Param('id') id: string) {
    return this.webhookDataService.getWebhookDataById(id);
  }

  @Get('by-order/:orderId')
  @Scopes('webhook:read', 'logs:read')
  async getWebhookDataByOrderId(@Param('orderId') orderId: string) {
    return this.webhookDataService.getWebhookDataByOrderId(orderId);
  }
}
```

#### Task 4.2: Update Response Format
Modify webhook response to include webhook data ID:

```typescript
// Updated response format
{
  "webhookDataId": "uuid-of-stored-data",
  "workflowId": "uuid-or-null",
  "jobId": "job-id-or-null", 
  "status": "stored_and_queued" | "stored_no_workflow",
  "message": "Webhook data stored successfully"
}
```

### Phase 5: Frontend Integration (Priority: MEDIUM)

#### Task 5.1: Add Webhook Data Dashboard
Create dashboard components to view webhook data:

```typescript
// apps/frontend/src/components/webhook-data/
- WebhookDataList.tsx        // List all webhook data with filters
- WebhookDataDetail.tsx      // View individual webhook payload
- WebhookDataFilters.tsx     // Filter by country, date, branch, etc.
- WebhookDataExport.tsx      // Export functionality
```

#### Task 5.2: Integrate with Existing Dashboard
Add webhook data metrics to main dashboard:
- Total webhook data received
- Webhook data by country
- Recent webhook activity
- Processing status distribution

### Phase 6: Testing & Validation (Priority: HIGH)

#### Task 6.1: Create Comprehensive Tests
```typescript
// Test scenarios to implement:
- Webhook data storage (with and without workflows)
- Data extraction accuracy
- Multiple country support
- Workflow matching logic
- API endpoint functionality
- Frontend component rendering
```

#### Task 6.2: Data Migration Testing
- Test with existing webhook data
- Validate data integrity
- Performance testing with large payloads
- Concurrent webhook processing

### Phase 7: Deployment & Monitoring (Priority: HIGH)

#### Task 7.1: Gradual Rollout
1. Deploy database schema changes
2. Deploy backend service updates
3. Deploy frontend enhancements
4. Update monitoring and alerts

#### Task 7.2: Monitoring Enhancement
- Add webhook data storage metrics
- Monitor processing success rates
- Track data extraction accuracy
- Alert on storage failures

## Success Criteria

### Functional Requirements
- [ ] All webhook data is stored regardless of workflow existence
- [ ] Structured data is properly extracted and queryable
- [ ] Full payload is preserved for comprehensive access
- [ ] System supports multiple countries seamlessly
- [ ] Workflow processing is optional but functional when configured
- [ ] API provides comprehensive webhook data access
- [ ] Frontend dashboard displays webhook data effectively

### Technical Requirements
- [ ] Database performance remains optimal with new schema
- [ ] Service handles high webhook volume
- [ ] Data extraction is accurate and consistent
- [ ] Error handling prevents data loss
- [ ] Monitoring provides visibility into system health

### Business Requirements
- [ ] No webhook data is lost
- [ ] Processing supports all Visanet countries
- [ ] System is scalable for future countries
- [ ] Data is accessible for business intelligence
- [ ] Customer communication workflows function properly

## Risk Mitigation

### Data Loss Prevention
- Always store webhook data before any processing logic
- Comprehensive error handling and logging
- Database constraints to prevent duplicate processing
- Backup and recovery procedures

### Performance Considerations
- Efficient database indexes for common queries
- Asynchronous workflow processing
- Connection pooling and query optimization
- Monitoring for performance degradation

### Backward Compatibility
- Gradual migration strategy
- Existing API compatibility where possible
- Comprehensive testing before deployment
- Rollback procedures if needed

## Timeline

### Week 1: Foundation
- Database schema updates
- Data extraction utilities
- Basic service redesign

### Week 2: Core Services
- WebhookDataService implementation
- ViziWebhooksService redesign
- Generic workflow creation

### Week 3: API & Integration
- API endpoints
- Frontend components
- Testing framework

### Week 4: Testing & Deployment
- Comprehensive testing
- Performance validation
- Production deployment

---

**This plan addresses the fundamental architectural flaws in the current system and creates a scalable, robust webhook processing system that properly stores and utilizes all Vizi webhook data across all countries.**