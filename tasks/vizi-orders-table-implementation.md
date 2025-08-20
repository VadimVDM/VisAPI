# Vizi Orders Table Implementation Plan

## Executive Summary

This document outlines the comprehensive implementation plan for creating a dedicated `orders` table in our Supabase database to properly store and manage all Vizi webhook data. The table will use a hybrid approach with structured columns for critical business data and JSONB fields for flexible, country-specific visa information.

---

## Requirements Analysis & Understanding

### Your Concrete Requirements (Re-articulated)

You need me to create an `orders` table that captures every Vizi webhook call as an individual order record. Here's what you've specifically asked for:

#### 1. **Core Order Data as Individual Columns**
- **What you want**: Each order's essential fields (order_id, form_id, branch, payment details, status) as dedicated columns
- **Why**: Easy querying, indexing, and reporting on business-critical data
- **My action**: Create columns for all Order object fields from the webhook

#### 2. **Client Information with Phone Transformation**
- **What you want**: Client name, email, and phone stored, but phone must be transformed from `{code: "+44", number: "1234567890"}` to single string `"441234567890"` (no plus sign)
- **Why**: Direct WhatsApp integration compatibility and simplified phone number handling
- **My action**: Implement phone transformation logic that strips '+' and concatenates code with number

#### 3. **WhatsApp Alerts Flag as Dedicated Column**
- **What you want**: `whatsappAlertsEnabled` as a boolean column (marked as "very important!")
- **Why**: Critical for notification routing and customer preference tracking
- **My action**: Extract from client object and store as top-level boolean column

#### 4. **Product Details as Individual Columns**
- **What you want**: Product name, country, docType, and docName as separate columns
- **Why**: Enable filtering and reporting by visa type and destination country
- **My action**: Flatten product object into individual columns

#### 5. **Entry Information as Columns**
- **What you want**: Entry date (planned arrival), urgency level, and file transfer method as dedicated columns
- **Why**: Critical for visa processing timelines and document delivery preferences
- **My action**: Extract these fields and store as date, varchar columns

#### 6. **Document URLs with Special Handling**
- **What you want**: Face photo and passport scan as individual columns, all other documents in JSON
- **Why**: Face and passport are universal requirements, others vary by country
- **My action**: Create `face_url` and `passport_url` columns, store rest in `files_data` JSON

#### 7. **Categorized JSON Columns for Variable Data**
- **What you want**: Separate JSON columns for passport, extraNationality, address, family, occupation, military, past travels, etc.
- **Why**: Flexible storage for country-specific requirements while maintaining organization
- **My action**: Create individual JSONB columns for each category

#### 8. **Support All Countries with Flexible Schema**
- **What you want**: Table must handle all visa types (UK, India, USA, etc.) with their varying data requirements
- **Why**: Single source of truth for all orders regardless of destination
- **My action**: Use JSON fields for country-specific variations

#### 9. **Backfill Historical Data**
- **What you want**: Import all past webhook data from logs into new orders table
- **Why**: Complete historical record and data consistency
- **My action**: Create script to parse logs and reconstruct order records

### Implementation Order (Logical & Sequential)

1. **Database Schema Design** (No dependencies)
   - Define all columns based on requirements
   - Plan JSON structure for flexible fields
   - Design indexes for performance

2. **Create Orders Table in Supabase** (Depends on: Schema Design)
   - Execute CREATE TABLE statement
   - Set up indexes
   - Configure RLS policies
   - Add triggers for data integrity

3. **Implement Data Transformation Logic** (Depends on: Table Creation)
   - Build phone number transformer
   - Create webhook-to-order mapper
   - Handle country-specific variations
   - Extract face/passport URLs separately

4. **Create Orders Service** (Depends on: Transformation Logic)
   - Build NestJS service for database operations
   - Implement create, update, and query methods
   - Add error handling and logging

5. **Update Webhook Controller** (Depends on: Orders Service)
   - Inject OrdersService into webhook controller
   - Save order on webhook receipt
   - Update order after processing

6. **Create Backfill Script** (Depends on: Orders Service)
   - Query historical logs
   - Parse and transform log data
   - Insert historical orders
   - Handle duplicates and errors

7. **Test All Country Types** (Depends on: All above)
   - Unit test transformations
   - Integration test with real payloads
   - Verify data integrity
   - Performance testing

8. **Deploy and Monitor** (Depends on: Testing)
   - Deploy to production
   - Monitor order creation
   - Verify backfill success

---

## Complete TODO List

### Phase 1: Database Design & Creation
- [ ] Design complete table schema with all required columns:
  - [ ] Core order fields (order_id, form_id, branch, etc.)
  - [ ] Client fields with phone as single string
  - [ ] WhatsApp alerts as dedicated boolean column
  - [ ] Product details as individual columns
  - [ ] Entry date, urgency, file_transfer_method as columns
  - [ ] Face and passport URLs as dedicated columns
  - [ ] Categorized JSON columns for flexible data
- [ ] Create orders table in Supabase
- [ ] Add all necessary indexes
- [ ] Configure RLS policies
- [ ] Add data integrity triggers

### Phase 2: Implementation
- [ ] Implement phone transformation function (remove +, concatenate)
- [ ] Create webhook-to-order transformation logic
- [ ] Build OrdersService in NestJS
- [ ] Update ViziWebhooksController to save orders
- [ ] Add order update logic for processing status

### Phase 3: Data Migration
- [ ] Create backfill script for historical data
- [ ] Parse existing logs for order information
- [ ] Handle data reconstruction from partial logs
- [ ] Implement duplicate prevention
- [ ] Run backfill for past 30 days

### Phase 4: Testing & Validation
- [ ] Test phone number transformation
- [ ] Test WhatsApp flag extraction
- [ ] Test face/passport URL extraction
- [ ] Verify all 11 countries work correctly
- [ ] Validate JSON field storage
- [ ] Performance test with 1000+ orders
- [ ] Verify no data loss during transformation

### Phase 5: Deployment
- [ ] Deploy to staging environment
- [ ] Run backfill on staging
- [ ] Verify data integrity
- [ ] Deploy to production
- [ ] Monitor order creation rate
- [ ] Verify all webhooks saving correctly

---

## Waiting for Your Confirmation

I understand you want:
1. An orders table that stores each webhook as a row
2. Critical fields as columns for easy access
3. Phone numbers combined without the + sign
4. WhatsApp preference prominently tracked
5. Face and passport URLs as dedicated columns
6. Other documents in JSON
7. Flexible JSON fields for country variations
8. Complete backfill of historical data

**Please confirm this understanding is correct and I should proceed with implementation.**

---

## Database Schema Design

### Primary Table: `orders`

```sql
CREATE TABLE public.orders (
  -- Primary Key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Order Core Data (from Order object)
  order_id VARCHAR(50) UNIQUE NOT NULL,        -- e.g., "IL250819GB16"
  form_id VARCHAR(50) NOT NULL,                -- e.g., "frm_W4zFsE2cIBOA"
  branch VARCHAR(10) NOT NULL,                 -- e.g., "il", "se", "co", "ru", "kz"
  domain TEXT NOT NULL,                        -- Source domain
  payment_processor VARCHAR(20) NOT NULL,      -- stripe/paypal/tbank/bill/bit/paybox
  payment_id TEXT NOT NULL,                    -- Payment transaction ID
  amount DECIMAL(10,2) NOT NULL,              -- Payment amount
  currency VARCHAR(3) NOT NULL,               -- Currency code (GBP, USD, etc.)
  order_status VARCHAR(20) NOT NULL,          -- active/completed/issue/canceled
  
  -- Client Information (flattened)
  client_name TEXT NOT NULL,                  -- Full name
  client_email TEXT NOT NULL,                 -- Email address
  client_phone VARCHAR(20) NOT NULL,          -- Combined phone (441234567890)
  whatsapp_alerts_enabled BOOLEAN DEFAULT FALSE, -- WhatsApp preference (VERY IMPORTANT!)
  
  -- Product Details (flattened)
  product_name TEXT NOT NULL,                 -- e.g., "UK Tourist Visa"
  product_country VARCHAR(20) NOT NULL,       -- Target country code
  product_doc_type VARCHAR(50),               -- e.g., "tourist", "business"
  product_doc_name TEXT,                      -- Display name
  
  -- Visa Processing Details (UPDATED: Now as individual columns)
  visa_quantity INTEGER DEFAULT 1,            -- Number of applicants
  entry_date DATE,                            -- Planned entry date (INDIVIDUAL COLUMN)
  urgency VARCHAR(20) DEFAULT 'standard',     -- Processing speed (INDIVIDUAL COLUMN)
  file_transfer_method VARCHAR(20),           -- How to receive documents (INDIVIDUAL COLUMN)
  
  -- Entry Information
  entry_port TEXT,                            -- Entry point/port
  entry_type VARCHAR(10),                     -- air/land/sea
  
  -- Document URLs (UPDATED: Face and passport as dedicated columns)
  face_url TEXT,                              -- Applicant photo URL (INDIVIDUAL COLUMN)
  passport_url TEXT,                          -- Passport scan URL (INDIVIDUAL COLUMN)
  
  -- Categorized JSON Data (flexible per country)
  passport_data JSONB,                        -- Passport information
  extra_nationality_data JSONB,               -- Additional citizenship
  address_data JSONB,                         -- Addresses (home/work)
  family_data JSONB,                          -- Family information
  occupation_data JSONB,                      -- Employment details
  military_data JSONB,                        -- Military service
  past_travels_data JSONB,                    -- Travel history
  emergency_contact_data JSONB,               -- Emergency contacts
  business_data JSONB,                        -- Business information
  files_data JSONB,                          -- Other document URLs (bank, invitation, etc.)
  coupon_data JSONB,                         -- Discount information
  form_meta_data JSONB,                      -- Form metadata
  
  -- Additional flexible data
  applicants_data JSONB,                      -- Full applicants array
  extra_data JSONB,                          -- Any country-specific fields
  
  -- Tracking & Audit
  webhook_received_at TIMESTAMPTZ NOT NULL,   -- When webhook was received
  processed_at TIMESTAMPTZ,                   -- When order was processed
  workflow_id UUID,                           -- Associated workflow if triggered
  job_id TEXT,                                -- Queue job ID if queued
  
  -- System fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_orders_form_id ON orders(form_id);
CREATE INDEX idx_orders_client_email ON orders(client_email);
CREATE INDEX idx_orders_client_phone ON orders(client_phone);
CREATE INDEX idx_orders_product_country ON orders(product_country);
CREATE INDEX idx_orders_order_status ON orders(order_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_webhook_received_at ON orders(webhook_received_at DESC);

-- GIN indexes for JSONB queries
CREATE INDEX idx_orders_passport_data ON orders USING GIN (passport_data);
CREATE INDEX idx_orders_applicants_data ON orders USING GIN (applicants_data);

-- Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Orders viewable by authenticated users" ON orders
  FOR SELECT
  USING (auth.role() IS NOT NULL);

CREATE POLICY "Orders insertable by service role" ON orders
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Orders updatable by service role" ON orders
  FOR UPDATE
  USING (auth.role() = 'service_role');
```

---

## Data Transformation Logic

### Phone Number Transformation

```typescript
function transformPhoneNumber(phone: { code: string; number: string }): string {
  // Remove + from country code and combine
  const cleanCode = phone.code.replace(/^\+/, '');
  const cleanNumber = phone.number.replace(/\D/g, ''); // Remove non-digits
  return `${cleanCode}${cleanNumber}`;
}

// Example: { code: "+44", number: "1234567890" } => "441234567890"
// Example: { code: "+1", number: "555-123-4567" } => "15551234567"
```

### Data Mapping Function

```typescript
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
  visa_urgency?: string;
  file_transfer_method?: string;
  
  // Entry details
  entry_date?: Date;
  entry_port?: string;
  entry_type?: string;
  
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
  webhook_received_at: Date;
  processed_at?: Date;
  workflow_id?: string;
  job_id?: string;
}

function transformWebhookToOrder(webhook: ViziWebhookDto): OrderTableData {
  const { form, order } = webhook;
  
  // Extract face and passport URLs from first applicant's files
  const applicantFiles = form.applicants?.[0]?.files || {};
  const faceUrl = applicantFiles.face || null;
  const passportUrl = applicantFiles.passport || null;
  
  // Create files_data without face and passport (those are in dedicated columns)
  const otherFiles = { ...applicantFiles };
  delete otherFiles.face;
  delete otherFiles.passport;
  
  return {
    // Order core data
    order_id: order.id,
    form_id: order.form_id,
    branch: order.branch,
    domain: order.domain,
    payment_processor: order.payment_processor,
    payment_id: order.payment_id,
    amount: order.amount,
    currency: order.currency,
    order_status: order.status,
    
    // Client information
    client_name: form.client.name,
    client_email: form.client.email,
    client_phone: transformPhoneNumber(form.client.phone),
    whatsapp_alerts_enabled: form.client.whatsappAlertsEnabled, // VERY IMPORTANT!
    
    // Product details
    product_name: form.product.name,
    product_country: form.product.country,
    product_doc_type: form.product.docType,
    product_doc_name: form.product.docName,
    
    // Visa details (NOW AS INDIVIDUAL COLUMNS)
    visa_quantity: form.quantity || 1,
    entry_date: form.entry?.date ? new Date(form.entry.date) : undefined,
    urgency: form.urgency || 'standard',
    file_transfer_method: form.fileTransferMethod,
    
    // Entry information
    entry_port: form.entry?.port,
    entry_type: form.entry?.crossing?.type,
    
    // Document URLs (FACE AND PASSPORT AS DEDICATED COLUMNS)
    face_url: faceUrl,
    passport_url: passportUrl,
    
    // Categorized JSON data
    passport_data: form.applicants?.[0]?.passport || null,
    extra_nationality_data: form.applicants?.[0]?.extraNationality || null,
    address_data: {
      personal: form.applicants?.[0]?.address,
      work: form.applicants?.[0]?.occupation?.address,
    },
    family_data: form.applicants?.[0]?.family || null,
    occupation_data: form.applicants?.[0]?.occupation || null,
    military_data: form.applicants?.[0]?.military || null,
    past_travels_data: form.applicants?.[0]?.pastTravels || null,
    emergency_contact_data: form.emergencyContact || null,
    business_data: form.business || null,
    files_data: otherFiles, // Other documents (bank, invitation, etc.)
    coupon_data: order.coupon || form.discount || null,
    form_meta_data: form.meta || null,
    
    // Full applicants array for multi-applicant orders
    applicants_data: form.applicants || [],
    
    // Store any extra country-specific fields
    extra_data: {
      termsAgreed: form.termsAgreed,
      orderId: form.orderId,
      // Add any other fields not captured above
      ...extractExtraFields(form)
    },
    
    // Tracking
    webhook_received_at: new Date(),
    processed_at: undefined, // Set when processing completes
    workflow_id: undefined, // Set if workflow triggered
    job_id: undefined, // Set if job queued
  };
}

function extractExtraFields(form: any): any {
  // Extract fields not in standard structure
  const standardFields = [
    'id', 'country', 'client', 'product', 'quantity', 'urgency',
    'discount', 'termsAgreed', 'orderId', 'meta', 'entry', 'business',
    'applicants', 'fileTransferMethod', 'emergencyContact'
  ];
  
  const extraFields: any = {};
  for (const key in form) {
    if (!standardFields.includes(key)) {
      extraFields[key] = form[key];
    }
  }
  return extraFields;
}
```

---

## Implementation Steps

### Phase 1: Database Setup

#### Step 1.1: Create Orders Table
```sql
-- Execute in Supabase SQL Editor
-- Full CREATE TABLE statement from schema section above
```

#### Step 1.2: Create Database Functions
```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to prevent duplicate orders
CREATE OR REPLACE FUNCTION check_order_duplicate()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM orders 
    WHERE order_id = NEW.order_id 
    AND id != COALESCE(NEW.id, gen_random_uuid())
  ) THEN
    RAISE EXCEPTION 'Duplicate order_id: %', NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER prevent_duplicate_orders BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION check_order_duplicate();
```

### Phase 2: Service Implementation

#### Step 2.1: Create Orders Service
```typescript
// apps/backend/src/orders/orders.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { ViziWebhookDto } from '@visapi/visanet-types';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async createOrder(webhookData: ViziWebhookDto): Promise<string> {
    const orderData = this.transformWebhookToOrder(webhookData);
    
    const { data, error } = await this.supabaseService
      .getClient()
      .from('orders')
      .insert(orderData)
      .select('id')
      .single();
    
    if (error) {
      this.logger.error('Failed to create order', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
    
    return data.id;
  }

  async updateOrderProcessing(
    orderId: string, 
    workflowId?: string, 
    jobId?: string
  ): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from('orders')
      .update({
        processed_at: new Date().toISOString(),
        workflow_id: workflowId,
        job_id: jobId,
      })
      .eq('order_id', orderId);
    
    if (error) {
      this.logger.error(`Failed to update order ${orderId}`, error);
    }
  }

  private transformWebhookToOrder(webhook: ViziWebhookDto): any {
    // Implementation from Data Transformation Logic section
  }

  private transformPhoneNumber(phone: { code: string; number: string }): string {
    const cleanCode = phone.code.replace(/^\+/, '');
    const cleanNumber = phone.number.replace(/\D/g, '');
    return `${cleanCode}${cleanNumber}`;
  }
}
```

#### Step 2.2: Update Webhook Controller
```typescript
// apps/backend/src/vizi-webhooks/vizi-webhooks.controller.ts
// Add OrdersService injection and call

async handleViziOrder(
  @Body() body: ViziWebhookDto,
  @Headers() headers: Record<string, string>,
) {
  const correlationId = headers['x-correlation-id'] || headers['x-request-id'];
  
  try {
    // Save order to database
    const orderId = await this.ordersService.createOrder(body);
    
    // Process webhook (existing logic)
    const result = await this.viziWebhooksService.processViziOrder(
      body,
      correlationId,
    );
    
    // Update order with processing results
    await this.ordersService.updateOrderProcessing(
      body.order.id,
      result.workflowId,
      result.jobId
    );
    
    return result;
  } catch (error) {
    // Error handling
  }
}
```

### Phase 3: Backfill Historical Data

#### Step 3.1: Create Backfill Script
```typescript
// scripts/backfill-orders.ts
import { SupabaseClient } from '@supabase/supabase-js';

async function backfillOrders() {
  const supabase = createSupabaseClient();
  
  // Query logs for Vizi webhook data
  const { data: logs, error } = await supabase
    .from('logs')
    .select('*')
    .like('message', '%Vizi webhook%')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Failed to fetch logs:', error);
    return;
  }
  
  console.log(`Found ${logs.length} webhook logs to process`);
  
  // Group logs by order_id to reconstruct webhook data
  const orderGroups = new Map<string, any[]>();
  
  for (const log of logs) {
    const orderId = log.metadata?.order_id;
    if (orderId) {
      if (!orderGroups.has(orderId)) {
        orderGroups.set(orderId, []);
      }
      orderGroups.get(orderId)!.push(log);
    }
  }
  
  console.log(`Processing ${orderGroups.size} unique orders`);
  
  // Process each order group
  for (const [orderId, orderLogs] of orderGroups) {
    try {
      // Reconstruct order data from logs
      const orderData = reconstructOrderFromLogs(orderLogs);
      
      // Check if order already exists
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('order_id', orderId)
        .single();
      
      if (!existing) {
        // Insert order
        const { error: insertError } = await supabase
          .from('orders')
          .insert(orderData);
        
        if (insertError) {
          console.error(`Failed to insert order ${orderId}:`, insertError);
        } else {
          console.log(`✓ Backfilled order ${orderId}`);
        }
      } else {
        console.log(`⊘ Order ${orderId} already exists`);
      }
    } catch (error) {
      console.error(`Failed to process order ${orderId}:`, error);
    }
  }
  
  console.log('Backfill complete');
}

function reconstructOrderFromLogs(logs: any[]): any {
  // Find the initial "Received Vizi webhook" log
  const receivedLog = logs.find(l => l.message === 'Received Vizi webhook');
  const processedLog = logs.find(l => l.message === 'Vizi webhook processed successfully');
  
  if (!receivedLog) {
    throw new Error('No received log found');
  }
  
  const metadata = receivedLog.metadata;
  
  // Reconstruct basic order structure from metadata
  return {
    order_id: metadata.order_id,
    form_id: metadata.form_id,
    branch: extractBranchFromOrderId(metadata.order_id),
    domain: 'unknown', // Not available in logs
    payment_processor: 'unknown',
    payment_id: 'unknown',
    amount: 0,
    currency: extractCurrencyFromCountry(metadata.country),
    order_status: processedLog ? 'completed' : 'active',
    
    // Client info not available in logs
    client_name: 'Historical Import',
    client_email: 'historical@import.com',
    client_phone: '0000000000',
    whatsapp_alerts_enabled: false,
    
    // Product info
    product_name: `${metadata.country} Visa`,
    product_country: metadata.country || 'unknown',
    product_doc_type: 'unknown',
    product_doc_name: 'Historical Import',
    
    // Minimal visa details
    visa_quantity: 1,
    visa_urgency: 'standard',
    file_transfer_method: 'unknown',
    
    // JSON data - minimal
    extra_data: {
      imported_from_logs: true,
      original_metadata: metadata,
    },
    
    // Tracking
    webhook_received_at: receivedLog.created_at,
    processed_at: processedLog?.created_at,
    workflow_id: processedLog?.metadata?.workflow_id,
    job_id: processedLog?.metadata?.job_id,
  };
}

function extractBranchFromOrderId(orderId: string): string {
  // Order IDs like "IL250819GB16" - first 2 chars are branch
  return orderId?.substring(0, 2).toLowerCase() || 'unknown';
}

function extractCurrencyFromCountry(country: string): string {
  const currencyMap: Record<string, string> = {
    'uk': 'GBP',
    'usa': 'USD',
    'canada': 'CAD',
    'india': 'INR',
    'israel': 'ILS',
    'vietnam': 'VND',
    'korea': 'KRW',
    'morocco': 'MAD',
    'saudi_arabia': 'SAR',
    'schengen': 'EUR',
  };
  return currencyMap[country] || 'USD';
}

// Run the backfill
backfillOrders().catch(console.error);
```

### Phase 4: Testing

#### Step 4.1: Unit Tests
```typescript
// apps/backend/src/orders/orders.service.spec.ts
describe('OrdersService', () => {
  describe('transformWebhookToOrder', () => {
    it('should transform UK visa webhook correctly', () => {
      const webhook = {
        form: {
          country: 'uk',
          client: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: { code: '+44', number: '7700900123' },
            whatsappAlertsEnabled: true,
          },
          product: {
            name: 'UK Tourist Visa',
            country: 'uk',
            docType: 'tourist',
            docName: 'Standard Tourist Visa',
          },
          // ... rest of form data
        },
        order: {
          id: 'IL250819GB16',
          form_id: 'frm_W4zFsE2cIBOA',
          branch: 'il',
          // ... rest of order data
        },
      };
      
      const result = service.transformWebhookToOrder(webhook);
      
      expect(result.order_id).toBe('IL250819GB16');
      expect(result.client_phone).toBe('447700900123');
      expect(result.whatsapp_alerts_enabled).toBe(true);
      expect(result.product_country).toBe('uk');
    });
    
    it('should handle India visa with business data', () => {
      // Test India-specific fields
    });
    
    it('should handle missing optional fields gracefully', () => {
      // Test with minimal data
    });
  });
});
```

#### Step 4.2: Integration Tests
```typescript
// Test with actual webhook payloads from all countries
const testCountries = [
  'uk', 'india', 'usa', 'canada', 'israel', 
  'vietnam', 'korea', 'morocco', 'saudi_arabia', 'schengen'
];

for (const country of testCountries) {
  describe(`${country} webhook processing`, () => {
    it(`should save ${country} order correctly`, async () => {
      const webhook = loadTestWebhook(country);
      const orderId = await ordersService.createOrder(webhook);
      
      const saved = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      expect(saved.data.product_country).toBe(country);
      expect(saved.data.order_status).toBe('active');
      // Verify all required fields
    });
  });
}
```

#### Step 4.3: Data Validation Tests
```sql
-- Verify all orders have required fields
SELECT COUNT(*) as missing_required
FROM orders
WHERE order_id IS NULL 
   OR client_email IS NULL 
   OR client_phone IS NULL
   OR product_country IS NULL;

-- Check for duplicate orders
SELECT order_id, COUNT(*) as count
FROM orders
GROUP BY order_id
HAVING COUNT(*) > 1;

-- Verify phone number format
SELECT client_phone
FROM orders
WHERE client_phone !~ '^\d{10,15}$'
LIMIT 10;

-- Check data distribution by country
SELECT product_country, COUNT(*) as order_count
FROM orders
GROUP BY product_country
ORDER BY order_count DESC;

-- Verify JSON fields are valid
SELECT id
FROM orders
WHERE passport_data IS NOT NULL 
  AND jsonb_typeof(passport_data) != 'object';
```

---

## Monitoring & Maintenance

### Monitoring Queries

```sql
-- Daily order volume
SELECT 
  DATE(webhook_received_at) as date,
  COUNT(*) as orders,
  COUNT(DISTINCT product_country) as countries
FROM orders
WHERE webhook_received_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(webhook_received_at)
ORDER BY date DESC;

-- Processing success rate
SELECT 
  COUNT(*) as total,
  COUNT(processed_at) as processed,
  ROUND(COUNT(processed_at)::numeric / COUNT(*) * 100, 2) as success_rate
FROM orders
WHERE webhook_received_at >= NOW() - INTERVAL '24 hours';

-- WhatsApp opt-in rate
SELECT 
  product_country,
  COUNT(*) as total,
  SUM(CASE WHEN whatsapp_alerts_enabled THEN 1 ELSE 0 END) as whatsapp_enabled,
  ROUND(SUM(CASE WHEN whatsapp_alerts_enabled THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as opt_in_rate
FROM orders
GROUP BY product_country
ORDER BY total DESC;
```

### Maintenance Tasks

1. **Daily**: Verify all webhooks are being saved to orders table
2. **Weekly**: Check for any orphaned orders without processing
3. **Monthly**: Archive old orders to cold storage
4. **Quarterly**: Review and optimize JSON field usage

---

## Success Criteria

- [ ] Orders table created with all specified columns
- [ ] All Vizi webhooks automatically saved to orders table
- [ ] Phone numbers properly formatted (no + sign, combined)
- [ ] JSON fields properly categorized
- [ ] Historical data backfilled for past 30 days
- [ ] All 11 countries tested and working
- [ ] No duplicate orders
- [ ] WhatsApp preference tracked accurately
- [ ] Processing status properly updated
- [ ] Performance indexes working (query time < 100ms)

---

## Timeline

- **Day 1**: Create table schema, implement service
- **Day 2**: Update webhook processing, deploy to staging
- **Day 3**: Run backfill script, verify data integrity
- **Day 4**: Testing all countries, fix any issues
- **Day 5**: Deploy to production, monitor

---

## Notes

- Keep original logs table for audit trail
- Orders table becomes source of truth for business data
- JSON fields allow flexibility for new countries
- Phone format enables easy WhatsApp integration
- Consider partitioning by month if volume grows > 100k/month