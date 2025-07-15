# Sprint 3: Advanced Workflow Features Implementation Plan

**Created:** July 15, 2025 08:20 IDT  
**Theme:** "Automate the business with enterprise-grade workflows"  
**Target RC:** v0.4.0-rc

## Objective

Build advanced workflow automation capabilities including WhatsApp integration via ChatGPT Builder, PDF generation, cron scheduling, comprehensive logging with PII redaction, and a logs explorer UI. Transform the VisAPI platform from a basic workflow engine to an enterprise-grade automation system.

## Prerequisites ✅

- ✅ Enhanced architecture from Sprint 2.5 provides solid foundation
- ✅ Shared libraries structure (`@visapi/*` namespace)
- ✅ Secure API key authentication with prefix/secret pattern
- ✅ Production deployments operational
- ✅ All test suites passing (9/9 suites, 68/68 tests)

## Tasks

### Backend Implementation

- [x] **S3-BE-01**: WhatsApp connector via ChatGPT Builder API (2 pts) ✅ **COMPLETED** (July 15, 2025)
  - ✅ Implemented CGB API integration in `@visapi/backend-core-cgb` library
  - ✅ Created CgbClientService, ContactResolverService, TemplateService
  - ✅ Enhanced WhatsAppProcessor with real API integration
  - ✅ Support for text, template/flow, and media messages
  - ✅ Comprehensive test coverage (4 test suites, >90% coverage)
  - ✅ Contact resolution with phone number normalization
  - ✅ Template mapping with dynamic flow discovery
  - ✅ Environment configuration with optional template mappings
  - 📄 Documentation: `docs/sprint-3.0-whatsapp.md`

- [ ] **S3-BE-02**: PDF generator via puppeteer-core (3 pts)
  - Isolate PDF generation in separate queue with `MEM_LIMIT=1024`
  - Store PDFs in Supabase Storage with 24h presigned URLs
  - Build configuration: `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
  - URL pattern: `https://pangdzwamawwgmvxnwkk.supabase.co/storage/v1/object/public/receipts/{jobId}.pdf`

- [ ] **S3-BE-03**: Cron seeder for repeatable jobs (2 pts)
  - Read DB workflows → BullMQ repeatables
  - Include unit test for cron drift detection
  - Support standard cron expressions (e.g., "0 9 * * 1-5")

- [ ] **S3-BE-04**: Workflow JSON schema validation middleware (1 pt)
  - AJV compile at boot for performance
  - Validate workflow definitions against established schema
  - Return structured validation errors

- [ ] **S3-BE-05**: Log service with PII redaction (2 pts)
  - Implement regex-based PII redaction patterns
  - Write structured logs to database with `pii_redacted: true` flag
  - Support workflow_id and job_id correlation

- [ ] **S3-BE-06**: Nightly log prune job (1 pt)
  - BullMQ repeatable job for 90-day log retention
  - Run nightly cleanup of old log entries
  - Monitoring and alerting for cleanup failures

- [ ] **S3-BE-07**: Paginated logs endpoint (1 pt)
  - `GET /api/v1/logs` with filtering and pagination
  - Support filtering by workflow_id, job_id, level, date range
  - Return structured response with total count

### Frontend Implementation

- [ ] **S3-FE-01**: Logs Explorer UI (3 pts)
  - Table view with pagination controls
  - Filter by workflow, job, level, date range
  - Real-time updates for new log entries
  - Export functionality for audit trails

### Quality Assurance & Testing

- [ ] **S3-QA-01**: Playwright E2E test (2 pts)
  - "Visa status update" end-to-end flow
  - Cron job triggers → WhatsApp message sent
  - Full workflow execution verification in CI

- [ ] **S3-QA-02**: k6 load testing (1 pt)
  - 100 req/s for 10 minutes
  - p95 latency ≤ 200ms requirement
  - Monitor queue depth and error rates

## Technical Details

### WhatsApp Integration (ChatGPT Builder API)

Based on `docs/cgb-whatsapp.md`, implement:

```typescript
// src/connectors/whatsapp.ts
export class WhatsAppConnector {
  async sendMessage(contact: string, template: string, variables?: Record<string, any>): Promise<{ msg_id: string }>;
  async getContacts(): Promise<Contact[]>;
  async createContact(contact: CreateContactDto): Promise<Contact>;
}
```

### PDF Generation Architecture

```typescript
// src/connectors/pdf.ts
export class PDFGenerator {
  async generateFromTemplate(template: string, data: any): Promise<{ url: string, jobId: string }>;
  async generateFromUrl(url: string): Promise<{ url: string, jobId: string }>;
}
```

### Workflow JSON Schema

Extend existing schema to support new connectors:

```json
{
  "steps": [
    {
      "type": "whatsapp.send",
      "config": {
        "contact": "+1234567890",
        "template": "visa_approved",
        "variables": { "name": "{{applicant.name}}" }
      }
    },
    {
      "type": "pdf.generate", 
      "config": {
        "template": "visa_certificate",
        "data": "{{workflow.context}}"
      }
    }
  ]
}
```

### Log Service Architecture

```typescript
export interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata: Record<string, any>;
  workflow_id?: string;
  job_id?: string;
  pii_redacted: boolean;
  created_at: Date;
}

export class LogService {
  async log(entry: Omit<LogEntry, 'id' | 'created_at' | 'pii_redacted'>): Promise<void>;
  async getLogs(filter: LogFilter, pagination: Pagination): Promise<PaginatedResult<LogEntry>>;
}
```

## Dependencies

### External Services
- **ChatGPT Builder API**: WhatsApp messaging service
- **Supabase Storage**: PDF file storage with presigned URLs
- **Puppeteer**: Headless Chrome for PDF generation

### Internal Dependencies
- `@visapi/shared-types`: Common interfaces for new features
- `@visapi/core-config`: Configuration for new connectors
- `@visapi/backend-util-redis`: Queue management for cron jobs
- `@visapi/frontend-data`: API client extensions for logs endpoint

## Success Criteria

### Functional Requirements
✅ WhatsApp messages send successfully via CGB API  
✅ PDFs generate and store in Supabase with valid presigned URLs  
✅ Cron scheduler creates and manages repeatable jobs  
✅ Log service redacts PII and stores structured entries  
✅ Logs Explorer UI displays filterable, paginated results  

### Performance Requirements
✅ E2E test passes: Cron → WhatsApp flow completes < 30 seconds  
✅ Load test passes: 100 req/s sustained, p95 ≤ 200ms  
✅ PDF generation: < 5 seconds for standard templates  
✅ Log queries: < 1 second for 10,000 record datasets  

### Quality Requirements
✅ All existing tests continue to pass (9/9 suites)  
✅ New features achieve >80% test coverage  
✅ No new linting or TypeScript errors  
✅ Memory usage remains stable under load  

## Implementation Strategy

### Phase 1: Core Connectors (Days 1-4)
1. WhatsApp connector implementation and testing
2. PDF generator with Supabase Storage integration
3. Unit tests for both connectors

### Phase 2: Workflow Engine (Days 5-7)
1. Cron seeder and scheduler implementation
2. Workflow schema validation enhancement
3. Integration testing with existing workflow system

### Phase 3: Logging & Monitoring (Days 8-10)
1. Log service with PII redaction
2. Logs endpoint with pagination
3. Nightly cleanup job implementation

### Phase 4: Frontend & E2E (Days 11-14)
1. Logs Explorer UI implementation
2. E2E test creation and validation
3. Load testing and performance optimization

## Risk Mitigation

- **ChatGPT Builder API**: Implement robust error handling and retry logic
- **PDF Memory Usage**: Isolate generation in separate queue with memory limits
- **PII Redaction**: Comprehensive regex patterns with unit test coverage
- **Cron Drift**: Monitor and alert on job execution delays
- **Storage Costs**: Implement automatic cleanup of old PDFs

## Notes

- Follow established patterns from Sprint 2.5 shared libraries architecture
- Maintain 100% test pass rate throughout implementation
- Use existing Redis infrastructure for cron job persistence
- Leverage Supabase Storage for cost-effective PDF hosting
- Ensure all new endpoints follow RESTful conventions

---

**Next Steps**: Begin with WhatsApp connector implementation, as it's the most complex integration and will establish patterns for other connectors.