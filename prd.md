# VisAPI: Product Requirements Document

**Version**: 1.4
**Status**: Final
**Last updated**: 14 Jul 2025

---

## 1. Executive Summary

VisAPI is an internal workflow automation engine designed to be the central nervous system for Visanet's operational tasks. In its MVP stage, VisAPI will automate critical, repetitive, and time-sensitive processes. By connecting to external services and internal data sources, it will streamline operations, reduce human error, and improve the speed and reliability of customer-facing updates.

The MVP includes the core automation engine and a secure Admin Dashboard to provide visibility and control over the system. This will provide immediate value by freeing up the operations team, enabling rapid issue resolution, and creating a scalable foundation for all future automation at Visanet.

## 2. Goals and Objectives

### 2.1. Business Goals

- **Reduce Manual Workload:** Decrease the man-hours spent on repetitive operational tasks by at least 30%.
  - **Baseline:** Currently estimated at 40 hours/week across the operations team.
  - **Data Collection Plan:** Implement metrics for `manual_hours_logged` and `notification_latency_ms` immediately to establish a firm baseline for post-launch comparison.
  - **Interim Milestones:** Target 10% reduction by week 4 and 20% by week 8 post-launch.
- **Improve Customer Update Speed:** Reduce the average time-to-notify for customer application status changes from hours to under 5 minutes.
  - **Baseline:** Current average notification latency is 4-6 hours.
- **Increase Operational Reliability:** Minimize human error in data entry and status updates, aiming for a 99.9% success rate for automated tasks.
- **Establish a Scalable Foundation:** Create a core platform and operator interface that can easily accommodate new workflows and integrations.

### 2.2. Product Goals

- Successfully launch a stable, production-ready MVP that automates at least three core business workflows.
- Provide a secure and reliable API gateway for all internal and external service integrations.
- Implement a robust task queue system capable of handling retries, prioritization, and monitoring.
- Deliver a secure Admin Dashboard for developers and operations to monitor system health, view logs, and perform manual actions.

## 3. Target Audience

- **Primary Users (Operations Team):** End-users of the automated workflows who will benefit from the system's output.
- **Secondary Users (Development Team):** Responsible for building, maintaining, and extending the VisAPI platform.
- **Admin Users (Subset of Ops/Devs):** Users who will interact directly with the Admin Dashboard to monitor jobs, troubleshoot issues, and perform privileged actions.

## 4. Scope & Features (MVP)

### 4.1. Core Automation Engine

| Area                         | Decision                                                                                                                              |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| API Gateway                  | NestJS (Docker) → Render “Web Service”. Versioned routes /api/v1/\*. <br>• Graceful SIGTERM drain <br>• Built-in Render health check (/livez). |
| Task Queue                   | BullMQ + Upstash Redis (TLS). Queues: critical, default, bulk.                                                                        |
| Workers                      | Identical Docker image → Render “Background Worker” dyno.                                                                             |
| Database / Storage / Auth    | Supabase (PostgreSQL, Row-Level Security, Buckets, Vault).                                                                            |
| Auth for Services            | API-Key header. 90-day rotation via /apikeys endpoint.                                                                                |
| Rate limits                  | 200 req/min burst, 2 req/sec sustained per key (Nest rate-limit guard).                                                               |

### 4.2. Workflow Triggers

- **Webhook Ingestion:**
  - With `Idempotency-Key` support.
  - Max payload size: 512 KB.
  - Accepted `Content-Types`: `application/json`, `application/x-www-form-urlencoded`.
- **Scheduled Polling (Cron Jobs):** Cron expressions will be stored in the database as the source of truth. The VisAPI application will be responsible for seeding these jobs into BullMQ on boot.
- **Manual API Trigger.**

### 4.3. Core Workflow Actions ("Connectors")

- **Slack Notifier, WhatsApp Notifier:** Will use a `template_registry` table for managing message templates. This table will include a `locale` field to support future internationalization.
- **PDF Generator:** Will run on a dedicated worker queue with a concurrency cap to prevent memory spikes from impacting other jobs.
- **Image Processor.**

### 4.4. Workflow Definitions

- Workflows will be defined as JSON in the database. The definition will include a `version` field using semantic versioning (e.g., "1.0.0") to support future evolution.

## 5. Admin Dashboard

A secure, internal web application to provide visibility and control over VisAPI.

### 5.1. Dashboard Objectives

- **Secure Operator Login:** Prevent unauthorized access using SSO and role-based access control (RBAC).
- **Observable Operations:** Provide a single pane of glass for queue health, job history, and error rates.
- **Ad-hoc Actions:** Enable authorized users to manually trigger or retry workflows to unblock customer issues quickly.

### 5.2. Dashboard Tech Stack

| Layer             | Choice                                                                          |
| :---------------- | :------------------------------------------------------------------------------ |
| Framework         | Next.js 14 on Vercel                                                            |
| Component Library | MUI or Chakra                                                                   |
| Authentication    | Supabase Email Magic-Link, domain allow-list @visanet.com; 30-min idle timeout. |
| Realtime          | Socket.IO via Render gateway (WebSocket).                                       |
| State             | React-Query.                                                                    |

### 5.3. Dashboard MVP Features

- **Authentication & Roles:** Secure login via Supabase Email Magic-Link with Just-In-Time (JIT) user provisioning (default role: `viewer`).
- **Job Queue Dashboard:** An embedded Bull-Board UI, secured behind the main application's authentication. Permissions will be enforced (e.g., `viewer` can view queues, `operator` can retry/clean jobs).
- **Logs Explorer:** A paginated table view of the `logs` table. PII will be redacted before storage, and a `pii_redacted` flag will be set. Logs have a 90-day TTL with a nightly pruning job.
- **Manual Workflow Trigger:** A simple UI to select a workflow and provide a JSON payload to trigger it.
- **Manual Action Example (Stripe Refund):** A dedicated form for operators to initiate a refund. It will require a two-step confirmation modal and will log all relevant audit fields (`actor_id`, `charge_id`, etc.).

## 6. Out of Scope for MVP

- A public-facing or customer-facing UI.
- A user-facing UI for building or configuring workflows.
- GraphQL API.
- Temporal integration.
- Advanced image processing (OCR, facial recognition).

## 7. System Architecture

```bash
┌──────────────┐ HTTPS  ┌────────────────┐  WebSocket  ┌──────────────────┐
│   Vercel     │──────▶│ Render Gateway │────────────▶│   Render Worker  │
│ (Next.js UI) │       │  (NestJS)      │             │   (BullMQ)       │
└──────────────┘       │  /api/v1/*     │◀──Redis────▶│                  │
                       └──────▲─────────┘   (Upstash) └──────────────────┘
                              │ SQL
                              ▼
                       ┌────────────────┐
                       │  Supabase DB   │
                       │ + Auth + Files │
                       └────────────────┘
```

## 8. Database Schema

A preliminary schema will be established with partial indexes on foreign keys and timestamps for performance.

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text CHECK (role IN ('viewer','operator','admin')) NOT NULL DEFAULT 'viewer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now() -- Trigger ON UPDATE now()
);

CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hashed_key text NOT NULL,
  label text,
  scopes text[], -- e.g., {'trigger', 'read_logs', 'manage_keys'}
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(), -- Trigger ON UPDATE now()
  expires_at timestamptz
);

CREATE TABLE logs (
  id bigserial PRIMARY KEY,
  workflow_id uuid,
  job_id uuid,
  level text,
  message text,
  payload jsonb,
  pii_redacted boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
-- Add index for fast UI pagination
CREATE INDEX idx_logs_created_at_desc ON logs (created_at DESC);
```

## 9. Post-MVP Roadmap

- **Q4 2025: Temporal Integration & Enhanced Observability:** Allocate a spike to prototype the Temporal TypeScript SDK and decide between Temporal Cloud vs. self-hosted to inform budget.
- **Q1 2026: Admin Dashboard v2 (Notification Center & Workflow Editor):** Add a real-time notification center to the dashboard. The initial workflow editor will be a YAML text editor with schema validation.
- **Q2 2026: UI Builder & Enhanced Security:** Evolve the workflow editor into a low-code, drag-and-drop UI. Integrate with an OIDC provider for granular, user-level permissions.

## 10. Testing Strategy

- **CI runs on GitHub Actions, using Render “preview env” for E2E.**
- **Unit Tests (Jest):** >80% coverage for backend logic.
- **Component/UI Tests (React Testing Library/Vitest):** >70% statement coverage for Admin UI components, enforced in CI.
- **Contract Tests (Pact/Nock):** Verify backend-to-external-API payloads using a contract test stub server running in CI.
- **E2E Tests (Playwright/Cypress):** Full tests for all user stories. E2E tests against staging will use "test" mode keys to avoid spamming live services, with data cleaned up nightly.
- **Load Tests (k6):** Simulate concurrent webhook posts against the API gateway.
- **Accessibility (a11y):** A Lighthouse CI check will be added for the Admin UI, requiring a score ≥ 90.

## 11. Operational Readiness & Security

### 11.1. Operational Procedures

| Item       | Detail                                                                               |
| :--------- | :----------------------------------------------------------------------------------- |
| Deploy     | Render “auto-deploy on main” + 5 % traffic preview instance for 30 min (canary).     |
| Backups    | Supabase PITR @5 min; Upstash auto-AOF every second.                                 |
| Alerting   | Grafana Cloud scrape of /metrics; rule → Slack #visapi-alerts + PagerDuty.             |
| Cost cap   | ≤ $300 USD/mo across Render dynos, Vercel hobby, Upstash pay-per-call, Supabase Pro.  |

### 11.2. Security & Compliance

- **Backend:** API Key auth for services, with defined scopes (`trigger`, `read_logs`, `manage_keys`).
- **Frontend:** Supabase Auth (email magic-link) for admins. Enforce least-privilege roles.
- **Audit Trail:** All manual actions taken through the Admin Dashboard must be logged to the `logs` table with the operator's user ID.
- **Data Retention Policy:** A formal document will list all data classes (logs, job payloads, PDFs) and their TTL (e.g., 90 days for logs) or archival plan.
- **Threat Model:** A threat-model workshop will be conducted, and its output (data-flow diagram, mitigations) will be attached as an appendix.

### 11.3. Forward Compatibility

- **Feature Flags:** A library like `@happykit/flags` or LaunchDarkly will be used for rolling out new features. A config flag `ENABLE_TEMPORAL=false` will be added to prepare for future integration.

## 12. Risk Register

| Risk                                    | Likelihood | Impact | Mitigation                                                                                             |
| --------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------ |
| Government portal layout changes break scraper | Medium     | High   | Encapsulate scraper logic per source; add HTML structure validation and alert on failure.              |
| WhatsApp message template rejected      | Low        | Medium | Store provider error codes in the job log; fall back to a Slack notification to the ops team for manual intervention. |
| Redis data loss                         | Low        | High   | Enable Redis AOF (Append-Only File) persistence with `fsync` set to every second.                         |
| PII leak in logs                        | Medium     | High   | Implement automated log scanning and redaction for known PII patterns before logs are stored.        |
| Google SSO outage                       | Low        | High   | Grant break-glass service account credentials for critical operations during an outage.                  |
| Bull-Board version drift vs. BullMQ     | Medium     | Medium | Pin Bull-Board version in lockfile; add E2E smoke test for the dashboard at deploy time.                 |
| Large cron job bursts cause worker spikes | Medium     | Medium | Stagger cron schedules across a time window or shard workloads by a key (e.g., country).               |