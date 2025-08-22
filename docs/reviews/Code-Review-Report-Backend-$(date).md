# Code Review Report - $(date)

## 🔴 Critical Priority

- [ ] **[SECURITY] Protect Bull Board admin routes with authentication and RBAC.** (`apps/backend/src/admin/admin.controller.ts:L6-L13`, `apps/backend/src/admin/admin.service.ts:L19-L38`)
- [ ] **[SECURITY] Restrictive CORS configuration. Do not allow wildcard in production.** (`apps/backend/src/main.ts:L19-L23`)
- [ ] **[SECURITY] Hard-coded Sentry DSN fallback must be removed.** (`apps/backend/src/instrument.ts:L4-L13`)
- [ ] **[SECURITY] Webhook logs persist full payloads including PII. Add structured redaction.** (`apps/backend/src/vizi-webhooks/vizi-webhooks.controller.ts:L154-L166`, `L248-L263`)
- [ ] **[SECURITY] Throttling guard not globally enforced.** (`apps/backend/src/app/app.module.ts:L43-L49`)

## 🟠 High Priority

- [ ] **[PERFORMANCE] Improve BullMQ connection logging and health checks.** (`apps/backend/src/queue/queue.module.ts:L45-L63`, `L64-L101`)
- [ ] **[REFACTOR] Secure Swagger docs behind auth or disable in production.** (`apps/backend/src/main.ts:L34-L51`)
- [ ] **[REFACTOR] Align admin path bases between controller and service.** (`apps/backend/src/admin/admin.controller.ts:L6`, `apps/backend/src/admin/admin.service.ts:L20`)
- [ ] **[SECURITY] Tweak auth verify endpoint to prevent probing.** (`apps/backend/src/auth/auth.controller.ts:L162-L179`)
- [ ] **[SECURITY] Avoid treating Authorization Bearer as API key.** (`apps/backend/src/auth/guards/api-key.guard.ts:L84-L91`)

## 🟡 Medium Priority

- [ ] **[TESTING] Add tests for admin auth, Sentry DSN requirement, CORS enforcement.** (new files)
- [ ] **[STYLE] Replace console logs with structured logger in queue module.** (`apps/backend/src/queue/queue.module.ts:L53-L86`)
- [ ] **[REFACTOR] Use DTOs + class-transformer for webhook normalization.** (`apps/backend/src/vizi-webhooks/vizi-webhooks.controller.ts:L79-L115`)
- [ ] **[PERFORMANCE] Select only needed columns in WhatsApp processor and ensure index.** (`apps/backend/src/queue/processors/whatsapp-message.processor.ts:L213-L225`)

## 🟢 Low Priority

- [ ] **[DOCS] Clarify prod env requirements and defaults.** (`apps/backend/src/main.ts:L19-L23`, `apps/backend/src/instrument.ts:L4-L13`)
- [ ] **[CLEANUP] Remove TODOs once idempotency is implemented.** (`apps/backend/src/vizi-webhooks/vizi-webhooks.controller.ts:L168-L176`, `L242-L246`)

---

## 3. Review Guidelines – Why and How

- Admin protection: add guards with `JwtAuthGuard`, `PermissionsGuard`, and `@RequirePermissions('admin:read')`.
- CORS: explicit origin list per env; error on missing config in prod.
- Sentry: no hard-coded DSN; require `SENTRY_DSN` in prod.
- Logging/PII: use `@visapi/backend-logging` `LogService` and redact payloads before storage.
- Throttling: register `ThrottlerGuard` as `APP_GUARD`.
- Swagger: disable in prod or guard access.
- BullMQ: structured logging + liveness/readiness; centralize config.
