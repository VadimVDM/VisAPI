# Worker Service

Separate NestJS application for processing generic background jobs.

## Purpose

Handles non-order-specific background jobs that don't require direct database access to orders/CBB data.

## Queue Responsibilities

### CRITICAL Queue
- High-priority generic jobs
- Concurrency: 5

### DEFAULT Queue  
- Standard priority jobs
- Concurrency: 10

### BULK Queue
- Low-priority batch operations
- Concurrency: 20

## Job Types Processed

- `slack.send` - Slack notifications
- `whatsapp.send` - Generic WhatsApp messages (NOT order confirmations)
- `pdf.generate` - PDF generation
- `workflow.process` - Workflow execution
- `logs.prune` - Log cleanup

## Important Notes

**CRITICAL**: This worker does NOT process:
- `whatsapp-messages` queue (handled by backend)
- `cbb-sync` queue (handled by backend)

The backend app handles all order-specific processing.

## Deployment

Deployed separately on Render as the "Worker" service alongside the "Gateway" (backend) service.

Last Updated: August 25, 2025