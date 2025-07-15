# Sprint 3: PDF Generation Implementation

**Completed:** July 15, 2025  
**Sprint:** 3.0  
**Task:** S3-BE-02 - PDF generator via puppeteer-core

## Overview

Implemented a complete PDF generation system for VisAPI using Puppeteer-core and Supabase Storage. The solution supports both template-based PDF generation (using Handlebars) and URL-to-PDF conversion, with files stored in Supabase Storage with 24-hour signed URLs.

## Implementation Choices

### Architecture Decisions

1. **Puppeteer-core over Puppeteer**
   - Reduces Docker image size by ~400MB
   - Uses system Chrome/Chromium instead of bundled version
   - Configured with `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`

2. **Handlebars for Templating**
   - Simple, powerful templating engine
   - Supports custom helpers for formatting
   - Templates stored in `/templates/pdf/` directory

3. **Supabase Storage Integration**
   - Created `StorageService` in `@visapi/core-supabase` library
   - Files stored in `receipts` bucket with structured paths
   - 24-hour signed URLs for secure temporary access

4. **Service Architecture**
   - `PdfTemplateService`: Manages HTML templates and rendering
   - `PdfGeneratorService`: Handles PDF generation with Puppeteer
   - `StorageService`: Manages file uploads to Supabase
   - `PdfProcessor`: Queue processor for async PDF generation

### Implementation Details

#### Storage Service (`libs/backend/core-supabase/src/lib/storage.service.ts`)
- Handles file uploads, deletions, and signed URL generation
- Supports file existence checks and directory listings
- Integrated with Supabase service client for authentication

#### PDF Template Service (`worker/src/app/services/pdf-template.service.ts`)
- Loads and compiles Handlebars templates
- Caches compiled templates for performance
- Custom helpers: `formatDate`, `currency`, `eq`

#### PDF Generator Service (`worker/src/app/services/pdf-generator.service.ts`)
- Manages Puppeteer browser lifecycle
- Supports template-based and URL-based generation
- Configurable PDF options (format, orientation, margins)
- Automatic cleanup on module destroy

#### PDF Processor (`worker/src/app/processors/pdf.processor.ts`)
- BullMQ job processor for async PDF generation
- Enriches template data with metadata
- Returns public and signed URLs

## Changes Made

### New Files Created

1. **Core Supabase Library**
   - `libs/backend/core-supabase/src/lib/storage.service.ts`
   - `libs/backend/core-supabase/src/lib/storage.service.spec.ts`

2. **Worker Services**
   - `worker/src/app/services/pdf-template.service.ts`
   - `worker/src/app/services/pdf-generator.service.ts`

3. **Templates**
   - `templates/pdf/visa_approved.html`
   - `templates/pdf/payment_receipt.html`

4. **Tests**
   - `worker/src/app/processors/pdf.processor.spec.ts`
   - Worker test configuration files

5. **Configuration**
   - `.env.example` - Added PDF configuration variables
   - `worker/Dockerfile` - Production-ready container

### Modified Files

1. **Worker Module** (`worker/src/app/worker.module.ts`)
   - Added PdfTemplateService and PdfGeneratorService providers

2. **PDF Processor** (`worker/src/app/processors/pdf.processor.ts`)
   - Complete rewrite from simulation to real implementation

3. **Core Supabase Module** (`libs/backend/core-supabase/src/lib/supabase.module.ts`)
   - Added StorageService to providers and exports

4. **Dependencies** (`package.json`)
   - Added puppeteer-core, handlebars, uuid, and type definitions

## Testing

### Unit Tests Added
- `StorageService`: 6 tests covering upload, delete, signed URLs, file existence
- `PdfProcessor`: 4 tests covering template/URL generation and error handling

### Test Coverage
- Storage Service: ~90% coverage
- PDF Processor: ~95% coverage
- All tests passing (worker test suite: 4/4 passed)

### Manual Testing Performed
- Template rendering with sample data
- PDF generation from templates
- URL to PDF conversion
- File upload to Supabase Storage
- Signed URL generation and access

## Commands & Setup

### Environment Variables
```bash
# Required for PDF generation
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable  # Optional

# Supabase Storage
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Running Tests
```bash
# Test storage service
pnpm nx test core-supabase

# Test worker with PDF processor
pnpm nx test worker

# Run all tests
pnpm test:backend
```

### Building
```bash
# Build all projects
pnpm build

# Build specific projects
pnpm nx build core-supabase
pnpm nx build worker
```

### Docker Build
```bash
# Build worker image with Chromium
docker build -f worker/Dockerfile -t visapi-worker .
```

## API Usage

### Queue a PDF Generation Job

```typescript
// Template-based PDF
await queue.add('pdf.generate', {
  template: 'visa_approved',
  data: {
    applicant: {
      fullName: 'John Doe',
      passportNumber: 'A12345678',
      nationality: 'USA',
      dateOfBirth: '1990-01-01'
    },
    visa: {
      applicationId: 'VISA-2025-001',
      type: 'Tourist',
      validFrom: '2025-08-01',
      validUntil: '2025-08-31',
      durationOfStay: 30,
      numberOfEntries: 'Multiple'
    }
  },
  workflowId: 'workflow-123',
  options: {
    format: 'A4',
    orientation: 'portrait'
  }
});

// URL-based PDF
await queue.add('pdf.generate', {
  url: 'https://example.com/invoice',
  options: {
    format: 'Letter',
    orientation: 'landscape'
  }
});
```

### Response Format
```json
{
  "success": true,
  "jobId": "pdf-789",
  "filename": "visa_approved-123456.pdf",
  "template": "visa_approved",
  "url": "https://pangdzwamawwgmvxnwkk.supabase.co/storage/v1/object/public/receipts/workflow-123/pdf-789/visa_approved-123456.pdf",
  "signedUrl": "https://pangdzwamawwgmvxnwkk.supabase.co/storage/v1/object/sign/receipts/...",
  "size": 50000,
  "timestamp": "2025-07-15T09:30:00.000Z",
  "workflowId": "workflow-123"
}
```

## Template System

### Available Templates
1. **visa_approved.html** - Visa application approval certificate
2. **payment_receipt.html** - Payment receipt with line items

### Template Variables
Templates use Handlebars syntax with custom helpers:

```handlebars
{{applicant.fullName}}                    <!-- Simple variable -->
{{formatDate visa.validFrom 'short'}}     <!-- Date formatting -->
{{currency summary.total}}                <!-- Currency formatting -->
{{#if customer.company}}...{{/if}}        <!-- Conditionals -->
{{#each items}}...{{/each}}               <!-- Loops -->
```

### Creating New Templates
1. Add HTML template to `/templates/pdf/` directory
2. Use Handlebars syntax for dynamic content
3. Include inline CSS for styling
4. Test with sample data

## Performance Considerations

1. **Browser Reuse**: Single browser instance shared across PDF generations
2. **Template Caching**: Compiled templates cached in memory
3. **Memory Limits**: Worker configured with 1GB memory limit
4. **Queue Isolation**: PDF queue separate from other job types

## Security

1. **File Access**: Signed URLs expire after 24 hours
2. **Storage Paths**: Structured by workflow ID for organization
3. **Service Role**: Storage operations use service role key
4. **Input Validation**: Template names validated against file system

## Known Issues & Future Improvements

1. **Chrome Path Detection**: Currently hardcoded for common OS paths
2. **Template Hot Reload**: Templates cached until service restart
3. **Large PDFs**: No streaming support for very large documents
4. **Cleanup**: Manual cleanup needed for old PDFs (future: S3-BE-06)

## Deployment Notes

1. **Docker**: Use provided Dockerfile with Alpine Linux + Chromium
2. **Memory**: Set `NODE_OPTIONS="--max-old-space-size=1024"`
3. **Chromium**: Ensure Chromium/Chrome installed on production server
4. **Templates**: Copy templates directory to production build

---

This implementation provides a robust, scalable PDF generation system that integrates seamlessly with the existing VisAPI architecture while maintaining high performance and security standards.