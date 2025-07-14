# VisAPI MVP: Release Plan & Development Roadmap

This document translates the VisAPI PRD (prd.md) into an actionable release plan. It is organized into a series of two-week sprints, each anchored to a Release Candidate (RC). This plan is designed for a dedicated engineering team (e.g., 2 Backend, 1 Frontend, 1 DevOps/SRE).

## Common Conventions & Project Hygiene

**Field Conventions:**
- **ID**: `<SPRINT>-<STREAM>-<#>` (e.g., `S1-BE-05`)
- **Est.**: Story points (1 ≈ ½ d, 2 ≈ 1 d, 3 ≈ 2 d)
- **Owner**: `BE-A`, `BE-B`, `FE`, `DevOps`, `QA`
- **AC**: Gherkin or bulleted acceptance criteria
- **Links**: Always link to OpenAPI path, Figma frame, or ADR in ticket

**Project Rules:**
- **Definition of Ready (DoR):** Every ticket must include a checklist: API doc updated ✔️ / Unit tests identified ✔️ / Data-contract signed ✔️.
- **ADR Cadence:** The sprint lead will record an Architecture Decision Record (ADR) for any significant tech choice or change.
- **PR Template:** All Pull Requests must use a template that includes "Linked task ID" and "How to test locally" sections.
- **Backlog Hygiene:** Use a `blocked-by` label for stalled tasks. Enforce a WIP (Work In Progress) limit of 3 tasks per engineer. Spike tickets will be time-boxed (e.g., 1 pt) and must result in a wiki page.

---

## Sprint 0: Foundation (RC v0.1.0-rc) ✅ COMPLETED
> Theme: "Build the factory before the car."
> **Completed:** July 14, 2025

| RC Tag | DoD Checklist | Stakeholder Demo |
| :--- | :--- | :--- |
| v0.1.0-rc | 🔄 CI green (pending)<br>✅ Local dev up in one cmd<br>🔄 Terraform plan valid (pending)<br>🔄 Threat model doc created (pending) | ✅ **DEMO READY:** Developer can clone repo, run `pnpm setup`, start dev environment with `pnpm dev`, and see both frontend (localhost:3001) and backend (localhost:3000/api) running successfully. |

| ID | Task | Est. | Owner | Dependencies | Status | Acceptance Notes |
| :--- | :--- | :---: | :--- | :--- | :---: | :--- |
| S0-DEV-01 | Initialise NX mono-repo (apps/, packages/, ESLint sharable config) | 2 | DevOps | – | ✅ | NX workspace with apps/frontend, apps/backend, shared ESLint config |
| S0-DEV-02 | Terraform baseline: Render (gateway, worker), Vercel, Upstash Redis, Supabase env vars | 2 | DevOps | – | 🔄 | **NEXT SPRINT:** Infrastructure automation needed |
| S0-BE-01 | Scaffold NestJS app: env validation, Pino logger, `helmet()` | 1 | BE-A | S0-DEV-01 | ✅ | NestJS app with basic structure, serves on localhost:3000/api |
| S0-FE-01 | Scaffold Next.js app: App Router, ESLint + Prettier, MUI/Chakra `theme.ts` | 1 | FE | S0-DEV-01 | ✅ | Next.js 14 with App Router, runs on localhost:3001 |
| S0-DEV-03 | GitHub Actions: mono-repo cache + job matrix (lint/test/build) | 2 | DevOps | S0-DEV-01 | 🔄 | **NEXT SPRINT:** CI/CD pipeline setup needed |
| S0-SEC-01 | Run Threat Model workshop; export Data-Flow diagram (draw.io) | 1 | All | – | 🔄 | **NEXT SPRINT:** Security documentation needed |
| S0-BE-02 | `node-pg-migrate` setup; create `users`, `api_keys`, `logs` tables + seed roles | 2 | BE-B | S0-DEV-02 | 🔄 | **NEXT SPRINT:** Database schema setup with Supabase |
| S0-DEV-04 | Enable Dependabot + Snyk OSS scan; Slack alerts | 1 | DevOps | – | 🔄 | **NEXT SPRINT:** Security tooling setup |
| S0-DEV-05 | Enable GitHub Actions → DORA metrics exporter | 1 | DevOps | S0-DEV-03 | 🔄 | **NEXT SPRINT:** Metrics and monitoring |

### Foundation Achievements ✅
- **NX Monorepo:** Complete workspace structure with TypeScript, ESLint, Prettier
- **Next.js Frontend:** App Router setup with development server
- **NestJS Backend:** API gateway with basic structure and endpoints
- **Docker Environment:** PostgreSQL, Redis, Adminer, Redis Commander for local development
- **Developer Experience:** One-command setup (`pnpm setup`) and development (`pnpm dev`)
- **Documentation:** Complete README.md and development guides

---

## Sprint 1: Core Engine & Gateway (RC v0.2.0-rc)
> Theme: “Build the engine and the chassis.”

| RC Tag | DoD Checklist | Stakeholder Demo |
| :--- | :--- | :--- |
| v0.2.0-rc | ✅ Gateway passes unit tests<br>✅ Webhook → Worker happy-path<br>✅ Health probes live<br>✅ OpenAPI spec published | Run a Postman collection against the live staging gateway. Show a job being created and processed in the queue. |

| ID | Task | Est. | Owner | Dependencies | Acceptance Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| S1-BE-01 | Hash, store, list API keys (`/apikeys` GET) | 2 | BE-A | S0-BE-02 | Returns key metadata (no secrets) |
| S1-BE-02 | Implement NestJS Guard (ApiKeyGuard) + `@Scopes()` decorator | 2 | BE-A | S1-BE-01 | Requests with invalid scope → 403 JSON error |
| S1-BE-03 | Add BullMQ to app; define queues (critical, default, bulk) | 2 | BE-B | – | `/queue/metrics` endpoint returns counts |
| S1-BE-03b | Redis TLS connection factory + health check probe | 1 | BE-B | S1-BE-03 | App fails to start if Redis is unreachable. Redis URL comes from Upstash secret; connection string is `rediss://`. |
| S1-BE-04 | Stand-alone worker process (apps/worker) with graceful shutdown | 2 | BE-B | S1-BE-03 | SIGTERM drains jobs ≤ 30 s |
| S1-BE-05 | Dead-Letter Queue (DLQ) pattern + CLI `dlq:replay` | 2 | BE-B | S1-BE-03 | Job replay returns 202 Accepted. `dlq:replay` writes JSON report to `./reports/replay-YYYYMMDD.json`. |
| S1-BE-06 | Webhook `POST /api/v1/triggers/{key}`: idempotency, 512 KB limit | 3 | BE-A | S1-BE-03 | Duplicate `Idempotency-Key` returns 202 no-op. Payload > 512 KB → 413. Invalid `content-type` → 415. |
| S1-BE-07 | OpenAPI generator & Swagger UI (auth-gated) | 1 | BE-A | – | `/docs` renders with 0 validator errors |
| S1-BE-08 | Health endpoints `/livez`, `/healthz` with DB/Redis checks | 1 | BE-A | S1-BE-03b | Render health checks pass |
| S1-QA-01 | Unit tests → 80% cov on auth, queue svc, webhook ctrl | 2 | QA | – | `pnpm test --coverage` ≥ 80 |

---

## Sprint 2: Admin Dashboard & Slack Connector (RC v0.3.0-rc)
> Theme: “Turn on the lights and connect the first wire.”

| RC Tag | DoD Checklist | Stakeholder Demo |
| :--- | :--- | :--- |
| v0.3.0-rc | ✅ Admin Magic Link auth works<br>✅ Slack connector sends msg in staging<br>✅ 70% FE component coverage<br>✅ Storybook deployed | Ops team logs into the admin dashboard via email magic link and manually triggers a workflow that sends a real message to a test Slack channel. |

| ID | Task | Est. | Owner | Dependencies | Acceptance Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| S2-FE-01 | Supabase Email Magic-Link Auth; domain allow-list | 2 | FE | S0-BE-02 | New user with allowed domain logs in, `users` table is populated. Other domains are rejected. |
| S2-FE-02 | Global RBAC hook (`usePermission('scope')`) | 1 | FE | S2-FE-01 | Hook correctly identifies user's role |
| S2-FE-03 | Layout shell (nav, auth guard, dark/light toggle) | 1 | FE | S2-FE-01 | Protected routes redirect unauth users |
| S2-FE-04 | Protected route `/queues` embedding Bull-Board with JWT | 1 | FE | S2-FE-03 | `viewer` role blocked from "retry/clean" buttons (UI greyed out, backend 403 if forced). |
| S2-BE-01 | Slack SDK wrapper (`src/connectors/slack.ts`) | 1 | BE-B | – | Wrapper class is unit tested |
| S2-BE-02 | Worker Processor `slack.send` + unit tests | 1 | BE-B | S2-BE-01 | Job payload is correctly mapped to SDK call. Slack rate-limit (HTTP 429) triggers retry with Jitter back-off ≤ 5 m. |
| S2-BE-03 | `POST /workflows/{id}/trigger` endpoint w/ schema validation | 2 | BE-A | S1 tasks | Invalid payload returns 400 with error details |
| S2-FE-05 | Manual Trigger UI form + JSON schema validator | 2 | FE | S2-FE-03, S2-BE-03 | Form shows validation errors on bad input |
| S2-OPS-01 | Submit WA templates in Twilio sandbox account | 1 | PM/Ops | – | At least 3 templates approved for testing |
| S2-QA-01 | FE component tests (RTL/Vitest) 70% coverage | 2 | QA | – | Storybook Chromatic diff passes |
| S2-QA-02 | Postman collection for Slack flow in staging | 1 | QA | – | Returns 200 + Slack message visible |

---

## Sprint 3: Workflows, Cron, Logging (RC v0.4.0-rc)
> Theme: “Automate the business.”

| RC Tag | DoD Checklist | Stakeholder Demo |
| :--- | :--- | :--- |
| v0.4.0-rc | ✅ All MVP connectors functional<br>✅ Cron scheduler running<br>✅ Logs explorer UI is live<br>✅ E2E tests passing in CI | Demo the "Application Status Update" E2E flow. Show a cron job running, a WhatsApp message being sent, and the full audit trail appearing in the Logs Explorer UI. |

| ID | Task | Est. | Owner | Dependencies | Acceptance Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| S3-BE-01 | WhatsApp connector (Twilio SDK, template registry) | 2 | BE-A | S2-OPS-01 | Store provider `msg_id` in job result |
| S3-BE-02 | PDF generator via `puppeteer-core`; isolate queue & `env var MEM_LIMIT=1024` | 3 | BE-B | – | PDF stored in `s3://visapi-receipts/{jobId}.pdf` with presigned URL valid 24h. Public URL follows pattern `https://<supabase-project>.supabase.co/storage/v1/object/public/receipts/{jobId}.pdf`. Build uses `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`. |
| S3-BE-03 | Cron seeder: read DB workflows → BullMQ repeatables | 2 | BE-A | – | Unit test for cron drift |
| S3-BE-04 | Workflow JSON schema validation middleware | 1 | BE-A | – | AJV compile at boot |
| S3-BE-05 | Log service: redact PII regex, write DB row | 2 | BE-B | – | Log entry has `pii_redacted: true` |
| S3-BE-06 | Nightly log prune job (BullMQ repeatable) | 1 | BE-B | – | Job runs and deletes logs > 90 days |
| S3-BE-07 | Create paginated logs endpoint `/api/v1/logs` | 1 | BE-A | S3-BE-05 | Endpoint supports filtering and pagination |
| S3-FE-01 | Logs Explorer: table, pagination, filter by workflow/job | 3 | FE | S3-BE-07 | UI correctly calls paginated endpoint |
| S3-QA-01 | Playwright E2E: “visa status update” flow (cron→WA msg) | 2 | QA | – | E2E test passes in CI |
| S3-QA-02 | k6 smoke test: 100 req/s for 10 min → p95 latency ≤ 200 ms | 1 | QA/DevOps | – | Test passes without significant errors |

---

## Sprint 4: Hardening & Launch (RC v1.0.0-rc)
> Theme: “Prepare for launch.”

| RC Tag | DoD Checklist | Stakeholder Demo |
| :--- | :--- | :--- |
| v1.0.0-rc | ✅ Prod deployment pipeline green<br>✅ Monitoring dashboards live<br>✅ Runbooks complete<br>✅ UAT & Security sign-off | A full "Game Day" demo: simulate failures (kill Redis, Slack 500s), show alerts firing, and walk through the runbook to recover the system. |

| ID | Task | Est. | Owner | Dependencies | Acceptance Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| S4-DEV-02 | Prometheus exporters (Nest & BullMQ histograms) | 2 | DevOps | – | Gateway exposes `http_request_duration_seconds` histogram; Workers expose `job_latency_seconds` & `job_fail_total`. `render.yaml` scrape config is linked. |
| S4-DEV-03 | Grafana Cloud alert rule → Slack (`visapi-alerts`) | 0.5 | DevOps | – | Test page acknowledged |
| S4-DEV-04 | Chaos toolkit set-up (e.g. for Render/Upstash) | 1 | DevOps | – | Can successfully simulate a service outage |
| S4-SEC-01 | Container hardening: switch to distroless images + Trivy scan gate in CI | 2 | DevOps | – | CI fails if critical vulnerabilities found |
| S4-SEC-02 | Generate CycloneDX SBOM + provenance attestation | 1 | DevOps | – | SBOM is published to artifact registry |
| S4-QA-01 | Full k6 load test: 5 k req/min for 30 min, 10 GB PDF batch | 2 | QA | – | System remains stable under load |
| S4-QA-02 | Lighthouse CI a11y audit ≥ 90 | 1 | QA | – | CI fails if score drops below 90 |
| S4-DOC-01 | Write runbooks: DLQ replay, Redis failover, secret rotation | 2 | DevOps/BE | – | Runbooks are clear and tested. Includes runbook for Stripe refund failure (manual fallback). |
| S4-ALL-01 | Game Day chaos script + facilitate 3 h session | 1 | All | S4-DEV-04 | Team successfully mitigates simulated failures. Includes Upstash network partition experiment. |
| S4-PM-01 | Launch Week Checklist & Go/No-Go | 0.5 | PM | – | All checklist items are green, including:<br>- Run cost estimate (DevOps)<br>- Confirm prod keys rotated (DevOps)<br>- Dry-run `dlq:replay` on staging (BE)<br>- Verify a11y score ≥ 90 (QA)<br>- Lock main branch (PM) |
| S4-DEV-05 | Tag v1.0.0, deploy to staging, 48 h soak | 1 | DevOps | – | No critical alerts during soak period |
| S4-ALL-02 | Production cut-over + hyper-care rotation schedule | 1 | DevOps/PM | – | Launch is successful |