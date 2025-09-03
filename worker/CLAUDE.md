# Worker Service

Background job processor for PDF generation and other async tasks.

## Architecture

Separate NestJS application deployed on Railway alongside API and Redis.

## Primary Responsibilities

### PDF Queue
- **Purpose**: Generate PDFs from HTML/URL/templates
- **Processor**: `PdfProcessor` with Puppeteer integration
- **Concurrency**: 3 simultaneous jobs
- **Storage**: Supabase documents bucket

### Other Queues
- **critical**: High-priority jobs (concurrency: 5)
- **default**: Standard jobs (concurrency: 10)
- **bulk**: Batch operations (concurrency: 20)

## Key Services

### PdfGeneratorService
- Puppeteer-based PDF generation
- Chromium browser management
- Supabase storage integration

### PdfTemplateService
- Handlebars template compilation
- Dynamic template loading
- Built-in examples (invoice, receipt, report)

## Deployment

```toml
# railway.worker.toml
[build]
dockerfilePath = "worker/Dockerfile"

[deploy]
runtime = "V2"
numReplicas = 1
```

## Environment

```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
NODE_ENV=production
REDIS_URL=redis://...
```

## Important Notes

- Does NOT process order-specific queues (`whatsapp-messages`, `cbb-sync`)
- Shares Redis with backend API
- Includes Chromium for PDF generation

**Last Updated**: September 3, 2025