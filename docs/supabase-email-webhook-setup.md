# Supabase Email Webhook Configuration

## Overview

This guide explains how to configure Supabase Auth to use VisAPI's custom email system instead of Supabase's default email templates.

## Prerequisites

- Backend deployed with email endpoints available at `https://api.visanet.app/api/v1/email/*`
- RESEND_API_KEY configured in production environment
- Email templates deployed and working

## Configuration Steps

### 1. Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/pangdzwamawwgmvxnwkk/auth/hooks)
2. Navigate to **Authentication** → **Hooks**

### 2. Create Send Email Hook

1. Click **"Add a new hook"**
2. Select **"Send Email"** as the hook type
3. Configure the hook:
   - **Name**: `VisAPI Email Service`
   - **Type**: Select **HTTPS**
   - **URL**: `https://api.visanet.app/api/v1/email/auth-hook`
   - **HTTP Headers**: (Optional) Add any custom headers if needed
   - **HTTP Timeout**: Keep default (5000ms)

### 3. Generate and Save Webhook Secret

1. Click **"Generate Secret"** button
2. Copy the generated secret (it will look like `v1,whsec_...`)
3. Save this secret - you'll need to add it to the backend environment

### 4. Enable the Hook

1. Toggle the **"Enable Webhook"** switch to ON
2. Click **"Create"** or **"Save"** to save the configuration

### 5. Update Backend Environment (if needed)

If webhook signature verification is implemented, add the webhook secret to Render:

```bash
SUPABASE_WEBHOOK_SECRET=v1,whsec_your_generated_secret_here
```

## Testing the Configuration

### 1. Test Email Endpoint

First, verify the email service is working:

```bash
curl -X GET "https://api.visanet.app/api/v1/email/health"
# Should return: {"status":"healthy","service":"email","timestamp":"...","integration":"resend"}
```

### 2. Test Auth Hook Endpoint

Test the webhook endpoint directly:

```bash
curl -X POST https://api.visanet.app/api/v1/email/auth-hook \
  -H "Content-Type: application/json" \
  -d '{
    "user": {"email": "test@visanet.app"},
    "email_data": {
      "token": "123456",
      "token_hash": "test_token_hash",
      "redirect_to": "https://app.visanet.app/auth/callback",
      "email_action_type": "magic_link",
      "site_url": "https://pangdzwamawwgmvxnwkk.supabase.co"
    }
  }'
```

### 3. Test Actual Auth Flow

1. Go to your frontend application
2. Try to sign up or request a magic link
3. Check your email for the branded VisAPI email
4. Verify the email contains:
   - VisAPI branding and logo
   - Correct magic link URL
   - Professional formatting

## Email Types Handled

The webhook handles all Supabase auth email types:

- `signup` - New user registration
- `magic_link` - Passwordless login
- `recovery` - Password reset
- `invite` - User invitation
- `email_change` - Email address change
- `email_change_new` - New email confirmation
- `reauthentication` - Re-authentication request

## Troubleshooting

### Emails Not Being Sent

1. Check backend logs: `curl https://api.visanet.app/api/v1/logs?service=email`
2. Verify RESEND_API_KEY is set in production
3. Check Resend dashboard for delivery status

### Webhook Not Being Called

1. Verify the webhook is enabled in Supabase dashboard
2. Check the webhook URL is correct
3. Look for errors in Supabase logs

### Email Templates Not Rendering Correctly

1. Test email templates in different email clients
2. Check for any template compilation errors in logs
3. Verify all template variables are being passed correctly

## Rollback Procedure

If you need to revert to Supabase default emails:

1. Go to Supabase Dashboard → Authentication → Hooks
2. Find the "Send Email" hook
3. Toggle **"Enable Webhook"** to OFF
4. Supabase will immediately revert to default email templates

## Security Considerations

- Webhook endpoint is public but validates payload structure
- Email addresses are validated before sending
- Rate limiting is applied to prevent abuse
- All emails are logged (with PII redaction) for audit trail