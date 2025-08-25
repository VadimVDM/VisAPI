# VisAPI Project Guide

Essential reference for AI assistants. Updated: August 25, 2025

## Overview

**VisAPI** - Enterprise workflow automation for Visanet's visa processing operations.

### Production Environment

- **Frontend**: https://app.visanet.app (Vercel)
- **Backend**: https://api.visanet.app (Railway)
- **Database**: Supabase (pangdzwamawwgmvxnwkk)
- **Redis**: Railway integrated service

### Current Status

- ✅ **Production stable** with Vizi webhook integration
- ✅ **WhatsApp messaging** via CBB API with idempotency protection
- ✅ **Queue architecture** - Separate backend/worker apps with distinct responsibilities
- ✅ **CQRS architecture** with repository pattern
- ✅ **16 test suites passing** (100% success rate)

## Documentation Map

```
VisAPI/
├── 📄 CLAUDE.md                                   # Main project guide (you are here)
├── apps/
│   └── backend/
│       ├── 📄 CLAUDE.md                          # Backend architecture & optimization
│       └── src/
│           ├── orders/
│           │   ├── 📄 CLAUDE.md                  # Orders module overview
│           │   ├── commands/📄 CLAUDE.md         # CQRS commands documentation
│           │   └── sagas/📄 CLAUDE.md            # Order sync saga patterns
│           ├── queue/📄 CLAUDE.md                # Queue processing system
│           └── vizi-webhooks/📄 CLAUDE.md        # Vizi webhook integration
├── libs/
│   └── backend/
│       ├── cache/📄 CLAUDE.md                    # Redis caching decorators
│       ├── core-cbb/📄 CLAUDE.md                 # CBB WhatsApp integration
│       ├── repositories/📄 CLAUDE.md             # Repository pattern implementation
│       └── whatsapp-business/📄 CLAUDE.md        # Meta WhatsApp API & ID correlation
└── worker/📄 CLAUDE.md                           # Background job processor
```

## Project Structure

```
VisAPI/
├── apps/
│   ├── frontend/          # Next.js 15 dashboard (Vercel)
│   └── backend/           # NestJS 11.1 API (Railway)
├── libs/
│   ├── frontend/          # React components and hooks
│   ├── backend/           # NestJS modules and services
│   └── shared/            # Cross-platform types and utils
├── docs/                  # Technical documentation
├── tasks/                 # Sprint planning
└── infrastructure/        # Terraform and deployment
```

## Technology Stack

**Frontend**

- Next.js 15, TypeScript 5.8, Tailwind CSS 4.1
- Supabase Auth with magic links
- Recharts for data visualization

**Backend**

- NestJS 11.1 with CQRS pattern
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

# Development
pnpm dev                   # Start all services
pnpm dev:frontend          # Frontend only (localhost:3001)
pnpm dev:backend           # Backend only (localhost:3000/api)

# Testing
pnpm test:backend:serial   # Fast serial tests (2.1s)
pnpm lint:backend          # Backend linting
pnpm build                 # Build all apps

# Docker
pnpm docker:up             # Start PostgreSQL & Redis
pnpm docker:down           # Stop services

# Admin Operations
pnpm create-admin-key      # Generate admin API key for retrigger ops
```

## Key APIs

```
POST /api/v1/webhooks/vizi/orders     # Vizi webhook
POST /api/v1/webhooks/vizi/retrigger  # Admin: Retrigger order creation
POST /api/v1/webhooks/vizi/resync-cbb # Admin: Resync CBB contact
POST /api/v1/webhooks/vizi/retrigger-whatsapp # Admin: Retrigger WhatsApp notification
GET  /api/v1/webhooks/whatsapp        # WhatsApp webhook verification
POST /api/v1/webhooks/whatsapp        # WhatsApp events from Meta
POST /api/v1/whatsapp/templates/sync  # Manual template sync
GET  /api/v1/whatsapp/templates       # List approved templates
GET  /api/v1/healthz                  # Health check
POST /api/v1/triggers/{key}           # Workflow trigger
GET  /api/v1/queue/metrics           # Queue status
```

## Security

- **API Keys**: Prefix/secret pattern with bcrypt hashing
  - Main: `visapi_` prefix
  - Vizi: `vizi_` prefix with `webhook:vizi` scope
- **Auth**: Supabase magic links (@visanet.com only)
- **Password**: 12+ chars with all character types
- **RLS**: Enabled on all database tables

## Queue Architecture

### Backend App Queues
- **whatsapp-messages**: Order confirmation messages via CBB API
- **cbb-sync**: Synchronize orders with CBB contacts

### Worker App Queues  
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

### Message Sending (CBB)

- All message sending via `@visapi/backend-core-cbb`
- Uses `X-ACCESS-TOKEN` header
- Template-based messaging only
- Hebrew translations included
- Correlation data in `biz_opaque_callback_data` for ID tracking

### Webhook Receiving (Meta WABA)

- **Endpoint**: `https://api.visanet.app/api/v1/webhooks/whatsapp`
- **Verification**: HMAC-SHA256 signature using `WABA_WEBHOOK_SECRET`
- **Phone Number ID**: 1182477616994327
- **Message ID Updates**: Automatic correlation from temp to real WAMIDs
- **Events Captured**:
  - Message delivery status (sent, delivered, read, failed)
  - Template status updates (approved, rejected)
  - Incoming customer messages
  - Account updates and alerts
- **Storage**: All events in `whatsapp_webhook_events` table
- **Zapier Forwarding**: Raw webhook payloads forwarded unchanged

### Business Rules & Message Tracking

- **Processing Times**: Database-driven via `processing_rules` table
  - Standard: 3 days, Morocco: 5 days, Vietnam: 7 days, Urgent: 1 day
- **Message ID Tracking**: Automatic update from temporary to real IDs
  - Correlation via `biz_opaque_callback_data` field
  - `MessageIdUpdaterService` handles webhook updates
  - `meta_message_id` column stores real Meta WAMIDs

## Environment Variables

See `.env.example` for complete template. Key variables:

```bash
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...

# Redis
REDIS_URL=redis://...
REDIS_PUBLIC_URL=redis://... (optional for Railway)

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=VisAPI <noreply@visanet.app>

# WhatsApp CBB
CBB_API_BASE_URL=https://...
CBB_ACCESS_TOKEN=...

# WhatsApp Meta Business API
WABA_PHONE_NUMBER_ID=1182477616994327
WABA_ACCESS_TOKEN=...
WABA_WEBHOOK_SECRET=<Meta App Secret from developers.facebook.com>
WABA_VERIFY_TOKEN=Np2YWkYAmLA6UjQ2reZcD7TRP3scWdKdeALugqmc9U

# Zapier Webhook
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...
```

## Troubleshooting

### Build Issues

```bash
pnpm clean                 # Clear NX cache
rm -rf node_modules
pnpm install
```

### Database Connection

```bash
docker-compose logs postgres
curl -I https://pangdzwamawwgmvxnwkk.supabase.co/health
```

### Redis Connection

```bash
redis-cli -h localhost -p 6379 ping
docker-compose logs redis
```

### Debug Commands

```bash
pnpm nx graph              # View dependency graph
pnpm ps                    # Running processes
lsof -i :3000             # Check port usage
```

## Documentation

- **[Environment Variables](./docs/environment-variables.md)** - Complete config guide
- **[Coding Standards](./docs/coding-standards.md)** - Code style and patterns
- **[Database Schema](./docs/database-schema.md)** - Table structure and RLS
- **[Testing Guide](./docs/testing-guide.md)** - Test strategies and commands
- **[CBB API Reference](./docs/cbb-api-reference.md)** - WhatsApp integration
- **[Vizi Webhook Setup](./docs/vizi-webhook-setup.md)** - Webhook configuration
- **[Project Roadmap](./tasks/roadmap.md)** - Sprint history and planning

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
10. **CBB sync**: Orders auto-trigger sync via OrderSyncSaga

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

**Version**: v1.0.7 Production
**Last Updated**: August 25, 2025
