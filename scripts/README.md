# VisAPI Scripts

This directory contains utility scripts for testing and maintenance of the VisAPI system.

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual values in `.env`:
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `VIZI_API_KEY`: Your Vizi webhook API key

## Available Scripts

### test-vizi-webhook.js
Tests the Vizi webhook endpoint with a sample payload.

```bash
VIZI_API_KEY=your_key node scripts/test-vizi-webhook.js
```

### test-exact-webhook-replay.js
Replays a specific webhook with the exact structure to verify processing.

```bash
VIZI_API_KEY=your_key SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/test-exact-webhook-replay.js
```

### test-missing-webhooks.js
Simulates missing webhooks for testing bulk processing.

```bash
VIZI_API_KEY=your_key SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/test-missing-webhooks.js
```

### import-missed-orders.js
Imports historical orders from webhook logs.

```bash
SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/import-missed-orders.js
```

## Security Notes

- **NEVER** commit actual API keys or secrets to the repository
- Always use environment variables for sensitive data
- Keep your `.env` file in `.gitignore`
- Rotate keys immediately if they are accidentally exposed