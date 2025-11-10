# VisAPI Project Guide

Essential reference for AI assistants. Updated: September 28, 2025

## Overview

**VisAPI** - Enterprise workflow automation for Visanet's visa processing operations.

### Production Environment

- **Frontend**: https://app.visanet.app (Vercel)
- **Backend**: https://api.visanet.app (Railway)
- **Worker**: Background processor (Railway - same project)
- **Database**: Supabase (pangdzwamawwgmvxnwkk)
- **Redis**: Railway integrated service (bitnami/redis:7.2.5)

### Current Status

- ✅ **Production stable** with Vizi webhook integration
- ✅ **WhatsApp messaging** via CBB API with idempotency protection
- ✅ **Queue architecture** - Streamlined without CQRS complexity
- ✅ **PDF generation** - HTML/URL to PDF with Puppeteer and templates
- ✅ **Phone normalization** - Removes leading zeros from all countries
- ✅ **12 test suites passing** (100% success rate)

## Technology Stack

**Frontend**

- Next.js 15, TypeScript 5.8, Tailwind CSS 4.1
- Supabase Auth with magic links
- Recharts for data visualization

**Backend**

- NestJS 11.1 with repository pattern
- BullMQ + Redis for queue processing
- PostgreSQL 16 (Supabase)

**Infrastructure**

- NX 21.2 monorepo with pnpm
- Node.js 22 runtime
- GitHub Actions CI/CD

## Quick Start

```bash
# Setup
pnpm setup                 # Install deps + Docker services
make python-setup         # Create/update Python virtualenv with pyairtable

# Development
pnpm dev                   # Start all services
pnpm dev:frontend          # Frontend only (localhost:3001)
pnpm dev:backend           # Backend only (localhost:3000/api)

# Testing
pnpm test:backend:serial   # Fast serial tests (2.1s)
pnpm lint:backend          # Backend linting
pnpm build                 # Build all apps
pnpm precommit             # Manual pre-commit checks

# Docker
pnpm docker:up             # Start PostgreSQL & Redis
pnpm docker:down           # Stop services

# Admin Operations
pnpm create-admin-key      # Generate admin API key for retrigger ops
pnpm bootstrap-completed-tracker # Initialize Airtable completed records tracker
```

## Key APIs

```
POST /api/v1/webhooks/vizi/orders     # Vizi webhook
POST /api/v1/webhooks/vizi/retrigger  # Admin: Retrigger order creation
POST /api/v1/webhooks/vizi/resync-cbb # Admin: Resync CBB contact
POST /api/v1/webhooks/vizi/retrigger-whatsapp # Admin: Retrigger WhatsApp notification
POST /api/v1/webhooks/vizi/resend-visa # Admin: Resend visa approval notifications
GET  /api/v1/webhooks/whatsapp        # WhatsApp webhook verification
POST /api/v1/webhooks/whatsapp        # WhatsApp events from Meta
POST /api/v1/whatsapp/templates/sync  # Manual template sync
GET  /api/v1/whatsapp/templates       # List approved templates
POST /api/v1/pdf/generate             # Generate PDF from HTML/URL/template
GET  /api/v1/pdf/status/{jobId}       # Check PDF generation status
POST /api/v1/pdf/generate/batch       # Batch PDF generation
GET  /api/v1/pdf/templates            # List available PDF templates
POST /api/v1/pdf/preview              # Preview PDF without saving
POST /api/v1/airtable/lookup          # Lookup order by email/ID/phone with linked record expansion
POST /api/v1/airtable/completed       # Lookup in completed view viwgYjpU6K6nXq8ii
POST /api/v1/airtable/completed/check # Manually check for new completed records
POST /api/v1/airtable/completed/bootstrap # Bootstrap tracker with existing records
GET  /api/v1/airtable/completed/stats # Get tracker statistics
GET  /api/v1/healthz                  # Health check
POST /api/v1/triggers/{key}           # Workflow trigger
GET  /api/v1/queue/metrics           # Queue status
```

## Security

- **API Keys**: Prefix/secret pattern with bcrypt hashing
  - Main: `visapi_` prefix
  - Vizi: `vizi_` prefix with `webhook:vizi` scope
  - Admin: Requires `integrations:airtable:read` for Airtable lookups
- **Auth**: Supabase magic links (@visanet.com only)
- **Password**: 12+ chars with all character types
- **RLS**: Enabled on all database tables

## Queue Architecture

### Backend App Queues

- **whatsapp-messages**: Order confirmation messages via CBB API
- **cbb-sync**: Synchronize orders with CBB contacts

### Worker App Queues

- **pdf**: PDF generation jobs (concurrency: 3)
- **critical**: High-priority generic jobs
- **default**: Standard priority jobs
- **bulk**: Low-priority batch operations

**CRITICAL**: Each queue must use `QUEUE_NAMES` constants from `@visapi/shared-types`. Never hardcode queue names.

## Database Architecture

### Core Tables

- **orders**: Main order data with foreign key references
- **cbb_contacts**: CBB sync data with Hebrew translations
- **whatsapp_messages**: Message tracking with idempotency keys

### Data Relationships

- Orders → CBB Contacts (via `cbb_contact_uuid`)
- Orders → WhatsApp Messages (via `order_id`)

## Development Notes

### Code Conventions

- TypeScript strict mode enabled
- ESLint + Prettier formatting
- Conventional commits
- Atomic changes with descriptive messages

### Pre-Commit Quality Checks

- **Automatic**: Git pre-commit hook runs on every commit
- **Smart Detection**: Only runs when backend/lib files are staged
- **5-Step Process**:
  1. **Code Formatting**: Auto-formats with Prettier/NX (auto-stages changes)
  2. **Security Scanning**: Bandit scans Python files (shows all, blocks only HIGH severity)
  3. **Backend Linting**: ESLint checks (`pnpm lint:backend`)
  4. **Type Checking**: TypeScript validation (`pnpm typecheck:backend`)
  5. **DB Types**: Regenerates Supabase types (auto-stages if changed)
- **Manual Run**: `pnpm precommit` to test before committing
- **Skip**: Use `git commit --no-verify` to bypass (not recommended)
- **Setup**: Run `make python-setup` to install bandit for security scanning

### Testing

- Use `pnpm test:backend:serial` for fast tests
- All tests must pass before deployment
- Coverage target: >80% backend, >70% frontend

### Common Patterns

- **Controllers**: `@Controller('v1/resource')` not `@Controller('api/v1/resource')`
- **Dates**: Pass ISO strings to queries, not Date objects
- **Types**: Use `@visapi/visanet-types` for Vizi/Visanet types
- **Validation**: Use Zod schemas for runtime validation
- **Database**: Use Supabase client, not raw SQL

## WhatsApp Integration (Hybrid Architecture)

**Status:** ✅ Production (100% correlation success rate as of Nov 10, 2025)

**Detailed Documentation:**

- **Webhook Module:** `apps/backend/src/webhooks/whatsapp/CLAUDE.md`
- **CBB Integration:** `libs/backend/core-cbb/CLAUDE.md`
- **Message Tracking:** `libs/backend/src/lib/services/CLAUDE.md`

### Message Sending (CBB)

- All message sending via `@visapi/backend-core-cbb` (Click2Bot API)
- Uses `X-ACCESS-TOKEN` header authentication (NOT Bearer token)
- Template-based messaging only (WhatsApp Business requirement)
- Hebrew translations with custom field mapping
- Phone numbers: E.164 format with leading zero removal (e.g., `972507...` not `9720507...`)

**Queue:** `whatsapp-messages` (BullMQ) - 10 concurrent workers

### Webhook Receiving (Meta WABA)

- **Endpoint**: `https://api.visanet.app/api/v1/webhooks/whatsapp`
- **Verification**: HMAC-SHA256 signature using `WABA_WEBHOOK_SECRET`
- **Phone Number ID**: 1182477616994327
- **Events Captured**:
  - Message delivery status (sent, delivered, read, failed)
  - Template status updates (approved, rejected)
  - Incoming customer messages
  - Account updates and alerts
- **Storage**: All events in `whatsapp_webhook_events` table
- **Zapier Forwarding**: Raw webhook payloads forwarded unchanged

### Message Tracking & Correlation

**Critical Fix (Nov 10, 2025):**

- **Issue**: CBB returns `{"c":"phone"}` instead of custom correlation data
- **Solution**: Phone-based correlation with 5-minute time windows
- **Result**: 100% correlation success (was 0% before fix)

**How it works:**

1. Message sent via CBB → receives temp ID (`temp_*`)
2. Meta webhook arrives with real WAMID (`wamid.*`) + phone number
3. `MessageIdUpdaterService` matches by phone + timestamp (5-min window)
4. Database updated: `message_id` and `meta_message_id` set to real WAMID
5. Subsequent status updates (delivered/read) tracked by real WAMID

**Database Indexes (added Nov 10, 2025):**

- `idx_whatsapp_messages_phone_created` - Fast phone-based correlation
- `idx_whatsapp_messages_meta_message_id` - Fast status updates by WAMID
- `idx_whatsapp_messages_phone_status` - Analytics queries

**Backfill Scripts:**

- `pnpm backfill-whatsapp:dry-run` - Preview historical correlation fixes
- `pnpm backfill-whatsapp` - Apply historical correlation and mark old stuck messages as failed

## Environment Variables

See `.env.example` for complete template. Configure via Railway dashboard or local `.env` file.

## Quick Fixes

1. **NestJS paths**: Use `'v1/resource'` not `'api/v1/resource'`
2. **Next.js 15**: Wrap `useSearchParams()` in `<Suspense>`
3. **Test mocks**: Match controller implementation
4. **Supabase auth**: Use `auth.verifyOtp()` not `auth.admin.verifyOtp()`
5. **API keys**: Use `hashed_secret` column only
6. **Vizi webhooks**: Accept as `any`, normalize, then cast to DTO
7. **WhatsApp**: Use template messaging only
8. **Dates**: Use ISO strings in queries
9. **Build scripts**: Exclude `src/scripts/**` from tsconfig.app.json
10. **CBB sync**: Orders auto-trigger sync via OrderSyncService
11. **Phone numbers**: Leading zeros removed after country codes

## Recent Updates

### WhatsApp Message Tracking Fix (November 10, 2025) 🎉

**The Problem:**

- 1,209 messages stuck in "sent" status since September
- Zero correlation between temp IDs and real Meta WAMIDs
- No delivery/read tracking whatsoever
- Root Cause: CBB sends `{"c":"phone"}` format instead of our custom correlation data

**The Solution:**

- ✅ **Phone-Based Correlation**: Match messages by phone number + 5-minute time window
- ✅ **Enhanced Parser**: Handle CBB's JSON format `{"c":"972phone"}`
- ✅ **Race Condition Fix**: Status updates work even before correlation completes
- ✅ **Database Indexes**: 3 new indexes for fast correlation and status updates
- ✅ **Backfill Script**: Clean up 862 stale records, correlate 182 historical messages

**The Result:**

- 🎯 **100% correlation success rate** for all new messages
- 🎯 **Real-time tracking**: sent → delivered → read (within seconds)
- 🎯 **Zero stuck messages**: All messages resolve properly
- 🎯 **18 messages sent today**: All tracked perfectly

**Files Modified:**

- `libs/backend/src/lib/services/message-id-updater.service.ts` - CBB parser
- `apps/backend/src/webhooks/whatsapp-webhook.controller.ts` - Race condition fix
- `apps/backend/src/scripts/backfill-whatsapp-messages.ts` - Historical cleanup
- Database migration: `add_whatsapp_message_tracking_indexes.sql`

**Detailed Documentation:**

- `apps/backend/src/webhooks/whatsapp/CLAUDE.md` - Full webhook system
- `libs/backend/core-cbb/CLAUDE.md` - CBB integration details
- `libs/backend/src/lib/services/CLAUDE.md` - MessageIdUpdaterService

---

### Visa Approval Notification System (September 28, 2025)

- **Multi-Application Support**: Handles up to 10 visa applications per order
- **Smart Templates**: First visa uses `visa_approval_file_phone`, rest use `visa_approval_file_multi_he`
- **Applicant Data**: Extracts full name, passport number, and DOB from Applications table
- **WhatsApp Integration**: Sends visa PDFs with 5-second delays between messages
- **Number Emojis**: Uses 1️⃣-9️⃣ and 🔟 for clear multi-visa identification
- **Duplicate Prevention**: Database flags prevent re-sending notifications
- **Initial Migration**: All 767 existing orders marked as already notified
- **Conditional Logic**: Only sends if CBB synced and notifications enabled
- **Manual Resend**: Admin endpoint with phone override capability
  - `POST /api/v1/webhooks/vizi/resend-visa` - Force resend visa notifications
  - Optional `phone` parameter to send to alternate recipient (removes `+` prefix)
  - Resets notification flag and fetches fresh data from Airtable
  - Application ID (`app.fields['ID']`) is primary identifier, Visa ID is optional
  - Proper error propagation for debugging failed resends

### Airtable Integration Enhanced

- **Linked Record Expansion**: Automatically fetches full details from Applications, Applicants, and Transactions
- **Python Integration**: Docker support with pyairtable for reliable API access
- **Field Support**: Searches by order ID, email, or phone with case-insensitive matching
- **Redis Caching**: 5-minute TTL reduces API calls by 85%
- **Completed Records Tracker**:
  - Tracks NEW records entering completed view (viwgYjpU6K6nXq8ii)
  - Uses "Completed Timestamp" field for incremental checks
  - Redis Set deduplication prevents re-processing
  - Automatic checks every 10 minutes via cron
  - Bootstrap command loads initial ~700 records
  - Triggers visa approval notifications for new records

### CQRS Removal & Phone Normalization

- **Architecture Simplified**: Removed CQRS complexity, streamlined to direct service calls
- **CBB Sync Fixed**: OrdersService now directly triggers CBB sync after order creation
- **Phone Normalization**: Strips leading zeros from phone numbers after country codes
- **Duplicate Prevention**: Fixes CBB contact duplication (e.g., 9720507247157 vs 972507247157)

### PDF Generation System (September 3, 2025)

- **Puppeteer Integration**: Chromium-based PDF generation in Worker
- **Template Engine**: Handlebars templates with examples
- **Storage**: Supabase bucket integration with signed URLs

## Critical Fixes (August 25, 2025)

### Queue Architecture Fixed

- **Issue**: Hardcoded queue names causing worker mismatch
- **Solution**: All processors use `QUEUE_NAMES` constants
- **Idempotency**: Atomic INSERT ON CONFLICT prevents duplicates
- **Auto-resume**: Queues resume automatically on startup

### WhatsApp Message ID Correlation Enhanced

- **Issue**: Race condition between MessageIdUpdaterService and delivery status updates
- **Root Cause**: updateMessageInDatabase tried to update by real WAMID before correlation completed
- **Solution**: Enhanced correlation with fallback logic and proper sequencing
- **Implementation**: Webhook handler now processes correlation before delivery updates
- **Fallback**: Manual correlation for legacy biz_opaque_callback_data formats
- **Result**: 100% message ID correlation success with robust error handling

## Known Issues

- NX peer dependencies: Minor version mismatch (non-blocking)
- Lighthouse CI: Disabled due to Next.js 15 compatibility
- Fastify `enableShutdownHooks()`: Disabled due to Node.js 22 compatibility

---

**Version**: v1.3.0 Production
**Last Updated**: November 10, 2025
