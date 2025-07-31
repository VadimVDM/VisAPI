# n8n Webhook Implementation Report

**Date**: July 31, 2025  
**Project**: VisAPI - Enterprise Workflow Automation System  
**Feature**: n8n.visanet.app Webhook Integration

## Executive Summary

We successfully implemented a secure webhook endpoint to receive visa order data from n8n.visanet.app. The implementation handles multiple visa types with varying data structures, supports multi-applicant orders, and stores all data in a well-structured PostgreSQL database hosted on Supabase. The webhook is secured with API key authentication and includes comprehensive logging for debugging and auditing purposes.

## Implementation Overview

### 1. Database Architecture

We created a comprehensive database schema to store visa order data across multiple normalized tables:

#### Core Tables Created

1. **`orders`** - Main order information
   - Stores order ID, payment details, status, and complete raw data
   - Uses JSONB for raw_data to preserve the original webhook payload
   - Foreign key relationships cascade to child tables

2. **`applicants`** - Individual applicant details
   - Comprehensive passport information
   - Address and occupation details
   - Support for visa-specific fields (military service, ID numbers, travel history)
   - Flexible schema with many optional fields

3. **`form_metadata`** - Form and product information
   - Product details stored as JSONB for flexibility
   - Client information and form metadata
   - Support for children and stay addresses

4. **`business_info`** - Business visa information
   - Separate table for business-related data
   - Linked to orders via foreign key

5. **`webhook_logs`** - Request logging
   - Tracks all incoming webhooks for debugging
   - Stores headers, body, response, and processing time

#### Schema Design Principles

- **Flexibility**: Used JSONB columns for complex nested data
- **Normalization**: Separated concerns into logical tables
- **Extensibility**: Optional columns accommodate different visa types
- **Data Integrity**: Foreign key constraints with CASCADE DELETE
- **Security**: Row-Level Security (RLS) enabled on all tables

### 2. API Endpoint Implementation

#### Endpoint Details
- **URL**: `POST /api/v1/webhooks/n8n/orders`
- **Authentication**: API key via `X-API-Key` header
- **Content-Type**: `application/json`

#### Security Features
- API key authentication with bcrypt hashing
- Scoped permissions: `webhook:n8n` and `orders:write`
- Input validation for required fields
- Error handling with appropriate HTTP status codes

#### NestJS Architecture
```
WebhooksModule
├── WebhooksController (HTTP layer)
├── WebhooksService (Business logic)
└── DTOs (Data validation)
```

### 3. Data Transformation Logic

The webhook service handles complex data transformations:

1. **Order Processing**
   - Creates order record with payment information
   - Stores complete raw data for reference

2. **Applicant Processing**
   - Maps nested applicant data to flat database columns
   - Handles optional fields gracefully
   - Supports both old and new data formats

3. **Metadata Processing**
   - Extracts form-level information
   - Stores product details with variations
   - Handles optional business information

4. **Queue Integration**
   - Queues post-processing jobs for workflows
   - Enables asynchronous processing of orders

### 4. Multi-Visa Type Support

The implementation successfully handles three distinct visa types:

#### Israeli Visa to Russia
- Basic structure with standard fields
- Single applicant support
- Minimal required information

#### Israeli Visa to India
- Complex structure with additional fields:
  - Military service details
  - National ID numbers
  - Business information
  - SAARC travel history
- Multi-applicant support (tested with 2 applicants)

#### Korean K-ETA
- Simplified structure with unique fields:
  - Last travel information
  - City of birth
  - Stay address in Korea
  - Product variations by nationality
- Missing some standard fields (e.g., passport issue date)

### 5. API Key Management

#### Generation Process
1. Created secure API key generation scripts
2. Uses cryptographically secure random values
3. Implements prefix/secret pattern (e.g., `n8n_xxx.yyy`)
4. Bcrypt hashing for secret storage

#### Key Features
- 1-year expiration by default
- Scoped permissions for security
- Database storage with audit fields
- Helper scripts for easy generation

### 6. Testing and Documentation

#### Test Scripts Created
1. `test-n8n-webhook.js` - Basic single applicant test
2. `test-multi-applicant-webhook.js` - Israeli multi-applicant test
3. `test-korean-visa-webhook.js` - Korean visa specific test

#### Documentation
1. **Database Schema** - Updated with all new tables and fields
2. **n8n Webhook Setup Guide** - Complete integration guide
3. **API Endpoint Documentation** - Swagger/OpenAPI annotations

## Technical Challenges and Solutions

### Challenge 1: Variable Data Structures
Different visa types have significantly different data structures.

**Solution**: 
- Made most fields optional in DTOs
- Used JSONB for complex nested data
- Stored raw data as backup
- Implemented flexible validation

### Challenge 2: Backward Compatibility
Need to support both old and new data formats.

**Solution**:
- Added conditional logic in data mapping
- Used optional chaining for nested properties
- Provided default values for missing fields

### Challenge 3: Multi-Applicant Orders
Orders can have varying numbers of applicants.

**Solution**:
- One-to-many relationship with applicants table
- Array processing in service layer
- Proper foreign key constraints

## Database Migrations

Five migrations were created to build the complete schema:

1. `003_create_orders_tables.sql` - Initial schema
2. `004_add_additional_order_fields.sql` - Israeli/Indian visa fields
3. `005_add_korean_visa_fields.sql` - Korean visa specific fields

## Performance Considerations

1. **Indexed Fields**
   - order_id, status, created_at on orders
   - applicant_id, order_id on applicants
   - form_id, order_id on form_metadata

2. **Efficient Queries**
   - Bulk inserts for multiple applicants
   - Single transaction per webhook

3. **Asynchronous Processing**
   - Queue integration for post-processing
   - Non-blocking webhook responses

## Security Implementation

1. **API Key Security**
   - Bcrypt hashed storage
   - Prefix for fast lookups
   - Expiration dates
   - Scoped permissions

2. **Data Protection**
   - RLS policies on all tables
   - Service role for writes
   - Authenticated role for reads

3. **Request Validation**
   - DTO validation with class-validator
   - Required field checks
   - Type safety with TypeScript

## Monitoring and Debugging

1. **Webhook Logs**
   - All requests logged with headers and body
   - Processing time tracking
   - Error logging with stack traces

2. **Debug Queries**
   ```sql
   -- Recent webhooks
   SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 10;
   
   -- Failed webhooks
   SELECT * FROM webhook_logs WHERE error IS NOT NULL;
   
   -- Multi-applicant orders
   SELECT o.order_id, COUNT(a.id) as applicants
   FROM orders o JOIN applicants a ON a.order_id = o.id
   GROUP BY o.id, o.order_id HAVING COUNT(a.id) > 1;
   ```

## Future Enhancements

1. **Data Validation**
   - Add more specific validation rules per visa type
   - Implement custom validators for complex rules

2. **Webhook Retry Logic**
   - Implement retry mechanism for failed webhooks
   - Add exponential backoff

3. **Analytics**
   - Add dashboard views for order statistics
   - Track conversion rates by visa type

4. **Automation**
   - Auto-generate PDFs from order data
   - Send WhatsApp notifications
   - Email confirmations

## Conclusion

The n8n webhook implementation successfully achieves its goals of:
- ✅ Receiving and storing visa order data securely
- ✅ Supporting multiple visa types with varying structures
- ✅ Handling multi-applicant orders
- ✅ Providing comprehensive logging and debugging capabilities
- ✅ Maintaining data integrity and security

The flexible schema design ensures the system can adapt to new visa types without major changes, while the comprehensive logging provides excellent debugging capabilities for production operations.

## Appendix: Key Files

### Backend Implementation
- `/apps/backend/src/webhooks/webhooks.module.ts`
- `/apps/backend/src/webhooks/webhooks.controller.ts`
- `/apps/backend/src/webhooks/webhooks.service.ts`
- `/apps/backend/src/webhooks/dto/n8n-order.dto.ts`

### Database Migrations
- `/apps/backend/migrations/003_create_orders_tables.sql`
- `/apps/backend/migrations/004_add_additional_order_fields.sql`
- `/apps/backend/migrations/005_add_korean_visa_fields.sql`

### Testing Scripts
- `/tools/scripts/generate-api-key-values.js`
- `/tools/scripts/test-n8n-webhook.js`
- `/tools/scripts/test-multi-applicant-webhook.js`
- `/tools/scripts/test-korean-visa-webhook.js`

### Documentation
- `/docs/database-schema.md` (updated)
- `/docs/n8n-webhook-setup.md` (new)
- `/docs/n8n-webhook-implementation-report.md` (this file)