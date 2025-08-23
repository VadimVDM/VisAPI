# Environment Variables Guide

This document provides a comprehensive overview of all environment variables used in the VisAPI project.

## 📁 Environment File Structure

The project uses a simplified 3-file approach for managing environment variables:

```
VisAPI/
├── .env.frontend          # Production values for Vercel (frontend only)
├── .env.backend           # Production values for Render (backend + monitoring)
├── .env.local             # Local development (all variables combined)
├── .env.example           # Template for local development
└── docs/environment-variables.md # This file - master documentation
```

## 🚀 Quick Start

### For Local Development:

1. Copy `../.env.example` to `../.env.local`.
2. Fill in the required values based on the reference below.
3. Run `pnpm dev` from the project root.

### For Frontend Deployment (Vercel):

1. Use the values from `../.env.frontend`.
2. Add them to the Vercel project dashboard.

### For Backend Deployment (Render):

1. Use the values from `../.env.backend`.
2. Add them to the Render service's environment settings.

## 📊 Complete Variable Reference

### 🎨 Frontend Variables (`.env.frontend`)

These variables are required for the Next.js frontend application. They are prefixed with `NEXT_PUBLIC_` to be exposed to the browser.

| Variable                        | Description                         | Example                     |
| ------------------------------- | ----------------------------------- | --------------------------- |
| `NEXT_PUBLIC_API_URL`           | Backend API endpoint                | `https://api.visanet.app`   |
| `NEXT_PUBLIC_ENV`               | Environment mode                    | `production`                |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                | `https://[ref].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe for frontend) | `eyJ...`                    |

### 🔧 Backend Variables (`.env.backend`)

These variables are for the backend NestJS application and must be kept secret.

#### Core Configuration

| Variable       | Description                                    | Required |
| -------------- | ---------------------------------------------- | -------- |
| `NODE_ENV`     | Node environment (`production`, `development`) | ✅       |
| `PORT`         | Server port                                    | ✅       |
| `DATABASE_URL` | PostgreSQL connection string                   | ✅       |
| `REDIS_URL`    | Redis connection (Upstash)                     | ✅       |

#### Supabase Configuration

| Variable                    | Description                          | Required |
| --------------------------- | ------------------------------------ | -------- |
| `SUPABASE_URL`              | Supabase project URL                 | ✅       |
| `SUPABASE_ANON_KEY`         | Public anon key                      | ✅       |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (keep secret!)      | ✅       |
| `SUPABASE_STORAGE_BUCKET`   | Storage bucket name for file uploads | ✅       |

#### Security

| Variable                | Description                                     | Required |
| ----------------------- | ----------------------------------------------- | -------- |
| `JWT_SECRET`            | JWT signing secret (long, random string)        | ✅       |
| `SESSION_SECRET`        | Session encryption key (long, random string)    | ✅       |
| `CRON_SECRET`           | Secret to authenticate internal cron jobs       | ✅       |
| `CORS_ORIGIN`           | Allowed origins for CORS                        | ✅       |
| `API_KEY_PREFIX`        | Prefix for generated API keys (e.g., `vsk_`)    | ✅       |
| `API_KEY_EXPIRY_DAYS`   | Default API key expiration in days              | ✅       |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated list of domains for admin login | ✅       |

#### Rate Limiting

| Variable                   | Description                   | Default |
| -------------------------- | ----------------------------- | ------- |
| `API_RATE_LIMIT_BURST`     | Max burst requests per minute | `200`   |
| `API_RATE_LIMIT_SUSTAINED` | Sustained requests per second | `2`     |

#### Queue Configuration

| Variable            | Description                                      | Default |
| ------------------- | ------------------------------------------------ | ------- |
| `QUEUE_CONCURRENCY` | Number of jobs the worker processes concurrently | `10`    |
| `QUEUE_MAX_RETRIES` | Max retry attempts for failed jobs               | `3`     |
| `QUEUE_RETRY_DELAY` | Base delay between retries (in ms)               | `5000`  |

#### Integrations

| Variable                           | Description                                        | Required |
| ---------------------------------- | -------------------------------------------------- | -------- |
| `CBB_API_URL`                      | WhatsApp API endpoint (ChatGPT Builder)            | ✅       |
| `CBB_API_KEY`                      | WhatsApp API key (CBB)                             | ✅       |
| **WhatsApp Business API (Direct Meta Integration)** |                                |          |
| `WABA_PHONE_NUMBER_ID`             | Meta WhatsApp phone number ID                      | ⏳       |
| `WABA_BUSINESS_ID`                 | Meta WhatsApp Business ID                          | ⏳       |
| `WABA_ACCESS_TOKEN`                | Meta permanent access token                        | ⏳       |
| `WABA_WEBHOOK_SECRET`              | Webhook signature verification secret              | ⏳       |
| `WABA_APP_SECRET`                  | Meta app secret                                    | ⏳       |
| `WABA_WEBHOOK_VERIFY_TOKEN`        | Webhook verification token                         | ⏳       |
| `WABA_API_VERSION`                 | Meta API version (default: v23.0)                  | ❌       |
| `WHATSAPP_DASHBOARD_ENABLED`       | Enable WhatsApp dashboard (default: false)         | ❌       |
| `WHATSAPP_ENABLE_FORWARDING`       | Forward webhooks to Zapier (default: true)        | ❌       |
| `RESEND_API_KEY`                   | Resend API key for sending emails                  | ✅       |
| `NOREPLY_EMAIL`                    | The "From" address for system emails               | ✅       |
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | Set to `true` in production to use system Chromium | ✅       |

#### Logging & Monitoring

| Variable     | Description                                      | Default |
| ------------ | ------------------------------------------------ | ------- |
| `LOG_LEVEL`  | Logging level (`error`, `warn`, `info`, `debug`) | `info`  |
| `LOG_FORMAT` | Log output format (`json`, `pretty`)             | `json`  |

#### Sprint 4: Monitoring & Alerting

| Variable                    | Description                                   | Required |
| --------------------------- | --------------------------------------------- | -------- |
| `GRAFANA_CLOUD_API_KEY`     | Grafana Cloud API key for pushing metrics     | ✅       |
| `GRAFANA_CLOUD_STACK_ID`    | Your Grafana Cloud stack identifier           | ✅       |
| `GRAFANA_CLOUD_ORG_ID`      | Your Grafana Cloud organization ID            | ✅       |
| `SLACK_WEBHOOK_URL`         | Slack webhook URL for sending alerts          | ✅       |
| `SLACK_BOT_TOKEN`           | Slack bot token for advanced integrations     | ❌       |
| `SLACK_SIGNING_SECRET`      | Slack app signing secret for webhooks         | ❌       |
| `SLACK_DEFAULT_CHANNEL`     | Default channel for Slack alerts              | ✅       |
| `SLACK_ENABLED`             | Enable/disable Slack integration              | ✅       |
| `PROMETHEUS_ENABLED`        | Enable Prometheus metrics endpoint            | ✅       |
| `PROMETHEUS_PORT`           | Port for Prometheus metrics endpoint          | `9090`   |
| `SENTRY_DSN`                | Sentry DSN for error tracking                 | ❌       |
| `PAGERDUTY_INTEGRATION_KEY` | PagerDuty integration key for critical alerts | ❌       |

## 🔐 Security Best Practices

1.  **Never commit** actual `.env` files to Git (only `.example` files should be tracked).
2.  **Rotate secrets** regularly, especially the `JWT_SECRET` and any service keys.
3.  **Use strong, randomly generated strings** for secrets (minimum 32 characters).
4.  **Limit access** to production environment variables using provider dashboards (Vercel, Render).
5.  **Audit regularly** to ensure no secrets have been accidentally exposed.

## 🛠️ Getting Credentials

### Supabase

1.  Navigate to your project's API settings: `https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api`
2.  Copy the Project URL, `anon` key, and `service_role` key.

### Upstash Redis

1.  Go to your database in the Upstash Console: `https://console.upstash.com/`
2.  Select the database and copy the Redis connection URL (e.g., `rediss://...`).

### Resend (Email)

1.  Navigate to the API Keys section: `https://resend.com/api-keys`
2.  Create a new API key with appropriate permissions.
3.  Verify your sending domain.

### ChatGPT Builder (WhatsApp CBB)

1.  Go to your dashboard: `https://app.chatgptbuilder.io/dashboard`
2.  Find and copy your API key.

### Meta WhatsApp Business API (Direct Integration)

1.  Create Meta App: `https://developers.facebook.com/apps`
2.  Add WhatsApp product to your app
3.  Configure webhook URL: `https://api.visanet.app/api/v1/webhooks/whatsapp`
4.  Get Phone Number ID from WhatsApp > API Setup
5.  Generate permanent access token in Access Tokens section
6.  Create webhook secret for signature verification
7.  Subscribe to webhook fields: messages, messages.status, message_template_status_update

### Grafana Cloud (Monitoring)

1.  Navigate to API keys: `https://grafana.com/profile/api-keys`
2.  Create a new API key with Admin or Editor role
3.  Go to your stack: `https://grafana.com/orgs/[your-org]/stacks`
4.  Copy the Stack ID and Org ID from the stack details

### Slack (Alerts)

1.  Create a new app: `https://api.slack.com/apps`
2.  Enable Incoming Webhooks and add to workspace
3.  Copy the webhook URL for your alerts channel
4.  For advanced features, get the Bot Token and Signing Secret from app settings

### Sentry (Error Tracking)

1.  Sign up at: `https://sentry.io/signup/`
2.  Create a new Node.js project
3.  Copy the DSN from project settings

### PagerDuty (On-Call Alerts)

1.  Create service at: `https://[your-domain].pagerduty.com/service-directory`
2.  Add Events API v2 integration
3.  Copy the integration key

## 📝 Environment Variable Types

- **Public (`NEXT_PUBLIC_...`)**: Safe for the frontend, as they are visible in the browser's source code.
- **Private**: Used only on the backend; never exposed to the client.
- **Secret**: Sensitive credentials that should be handled with extreme care and rotated periodically.
- **Optional**: Have sensible defaults in the application code and are not strictly required.

## 🚨 Troubleshooting

### Common Issues:

1.  **"Invalid REDIS_URL"**:
    - Ensure the URL is complete and correctly formatted: `rediss://default:password@host:port`.
    - Check that the password or host has not been truncated during copy-pasting.
2.  **"CORS errors"** in the browser console:
    - Verify that `CORS_ORIGIN` in your backend environment matches your frontend URL exactly, including the protocol (`https://...`).
3.  **"Database connection failed"**:
    - Check the `DATABASE_URL` format and credentials.
    - Ensure your machine's IP is whitelisted in Supabase if network restrictions are enabled.
    - Verify the Supabase project is active and not paused.
4.  **"Missing environment variable"** on startup:
    - Check the application logs for the specific variable name that is missing.
    - Ensure all required variables are present in the correct `.env` file for your environment.
