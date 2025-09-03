# PDF Generation Module

Modern PDF generation system with queue-based processing and template support.

## Overview

Generates PDFs from HTML, URLs, or Handlebars templates using Puppeteer in a Worker service.

## Architecture

```
API (Backend)           Redis Queue          Worker Service
     │                       │                      │
Generate Request ──────> BullMQ Job ──────> PDF Processor
     │                       │                      │
Track Job Status <────── Job Updates <────── Puppeteer/Chrome
     │                                             │
Return Result <──────────────────────────── Supabase Storage
```

## Key Components

### Backend API (`/api/v1/pdf/*`)
- **PdfController**: REST endpoints for PDF operations
- **PdfService**: Job queuing and management
- **PdfJobService**: Redis-based job tracking
- **PdfStatusService**: Real-time status updates

### Worker Service
- **PdfProcessor**: BullMQ job processor (concurrency: 3)
- **PdfGeneratorService**: Puppeteer wrapper for PDF creation
- **PdfTemplateService**: Handlebars template compilation

## API Endpoints

```typescript
POST /api/v1/pdf/generate       // Queue PDF generation job
GET  /api/v1/pdf/status/:jobId  // Check job status
POST /api/v1/pdf/generate/batch // Batch generation
GET  /api/v1/pdf/templates      // List available templates
POST /api/v1/pdf/preview        // Preview without saving
```

## PDF Sources

1. **HTML**: Direct HTML string to PDF
2. **URL**: Web page to PDF
3. **Template**: Handlebars template with data

## Job Processing

- Queue: `QUEUE_NAMES.PDF` 
- Concurrency: 3 simultaneous jobs
- Retry: 3 attempts with exponential backoff
- Timeout: 60 seconds per job
- Storage: Supabase `documents` bucket

## Templates

Location: `/app/templates/pdf/examples/`

Available templates:
- `invoice` - Invoice with line items
- `receipt` - Payment receipt
- `report` - Generic report

## Configuration

```bash
# Queue settings
PDF_QUEUE_CONCURRENCY=3
PDF_JOB_ATTEMPTS=3
PDF_JOB_TIMEOUT=60000

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Storage
PDF_STORAGE_BUCKET=documents
PDF_SIGNED_URL_EXPIRY=3600
```

## Usage Example

```typescript
// Generate PDF from template
await pdfService.generatePdf({
  source: 'template',
  template: 'invoice',
  data: {
    invoiceNumber: 'INV-001',
    customerName: 'John Doe',
    items: [...]
  },
  filename: 'invoice-001',
  options: {
    format: 'A4',
    orientation: 'portrait'
  }
});
```

**Last Updated**: September 3, 2025