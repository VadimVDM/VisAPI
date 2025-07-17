# Supabase Email Webhook Setup Guide

This guide provides comprehensive documentation for configuring Supabase Auth to use VisAPI's custom email system with branded templates and Resend integration.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Configuration Steps](#configuration-steps)
- [Testing Procedures](#testing-procedures)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Security Considerations](#security-considerations)
- [API Reference](#api-reference)
- [Monitoring and Maintenance](#monitoring-and-maintenance)

## Overview

VisAPI's custom email system intercepts Supabase's default authentication emails and replaces them with branded, professional templates delivered through Resend. This ensures consistent branding and enhanced deliverability for all authentication-related emails.

### Email Types Supported

1. **Magic Link Authentication** - Passwordless login emails
2. **Welcome Emails** - New user registration confirmation
3. **Password Reset** - Secure password recovery emails
4. **Email Verification** - Account email confirmation

### Architecture Flow

```
┌─────────────────┐     Webhook      ┌──────────────────┐     Resend API    ┌─────────────┐
│  Supabase Auth  │ ───────────────▶ │  VisAPI Backend  │ ───────────────▶ │   User      │
│   (Trigger)     │  POST /api/v1/   │  Email Service   │                  │  Mailbox    │
└─────────────────┘  email/auth-hook └──────────────────┘                  └─────────────┘
```

## Prerequisites

Before configuring the webhook, ensure you have:

1. **VisAPI Backend Deployed**
   - Production URL: `https://api.visanet.app`
   - Webhook endpoint accessible: `/api/v1/email/auth-hook`

2. **Resend Account Setup**
   - API key generated
   - Domain verified (visanet.app)
   - From email configured

3. **Environment Variables**
   ```bash
   # Backend (.env)
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM_EMAIL=VisAPI <noreply@visanet.app>
   SUPABASE_URL=https://pangdzwamawwgmvxnwkk.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Supabase Project Access**
   - Admin access to Supabase dashboard
   - Service role key for backend

## Configuration Steps

### Step 1: Access Supabase Dashboard

1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `pangdzwamawwgmvxnwkk`
3. Navigate to **Authentication** → **Email Templates**

### Step 2: Configure Auth Hook URL

1. Go to **Authentication** → **Hooks**
2. Click **Add Hook**
3. Configure the webhook:
   ```
   Name: VisAPI Custom Email Handler
   Type: Email
   URL: https://api.visanet.app/api/v1/email/auth-hook
   Events: All email events
   ```

### Step 3: Disable Default Email Templates

1. Navigate to **Authentication** → **Email Templates**
2. For each template type (Confirmation, Magic Link, Password Reset):
   - Toggle **Enable Custom Template** to OFF
   - This ensures Supabase sends webhooks instead of emails

### Step 4: Configure Email Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Set the following URLs:
   ```
   Site URL: https://app.visanet.app
   Redirect URLs:
   - https://app.visanet.app/auth/callback
   - https://app.visanet.app/auth/reset-password
   - https://app.visanet.app/auth/verify
   ```

### Step 5: Enable Email Auth Settings

1. Navigate to **Authentication** → **Providers** → **Email**
2. Ensure these settings:
   ```
   Enable Email Signup: ✓
   Confirm Email: ✓
   Secure Password Recovery: ✓
   Email Domain Allowlist: @visanet.com (if restricting domains)
   ```

### Step 6: Verify Webhook Configuration

Test the webhook endpoint directly:
```bash
curl -X POST https://api.visanet.app/api/v1/email/auth-hook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "signup",
    "user": {
      "email": "test@visanet.com",
      "user_metadata": {
        "full_name": "Test User"
      }
    },
    "email_data": {
      "token": "test-token-123",
      "token_hash": "test-hash-123",
      "redirect_to": "https://app.visanet.app/auth/callback"
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Email sent successfully",
  "emailType": "welcome"
}
```

## Testing Procedures

### 1. Test Magic Link Login

```typescript
// Frontend test code
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Trigger magic link
const { error } = await supabase.auth.signInWithOtp({
  email: 'test@visanet.com',
  options: {
    emailRedirectTo: 'https://app.visanet.app/auth/callback'
  }
});
```

### 2. Test Password Reset

```typescript
// Trigger password reset
const { error } = await supabase.auth.resetPasswordForEmail(
  'test@visanet.com',
  {
    redirectTo: 'https://app.visanet.app/auth/reset-password'
  }
);
```

### 3. Test Email Verification

```typescript
// Trigger email verification (happens automatically on signup)
const { error } = await supabase.auth.signUp({
  email: 'newuser@visanet.com',
  password: 'secure-password-123',
  options: {
    data: {
      full_name: 'New User'
    }
  }
});
```

### 4. Manual Webhook Testing

Use the test endpoint to verify email delivery:
```bash
curl -X POST https://api.visanet.app/api/v1/email/test \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "to": "test@visanet.com",
    "template": "magic-link",
    "data": {
      "userName": "Test User",
      "magicLink": "https://app.visanet.app/auth/callback?token=test"
    }
  }'
```

### 5. Verify Email Delivery

1. Check Resend dashboard for delivery status
2. Verify email appears in recipient's inbox
3. Check formatting and branding
4. Test all links work correctly

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Webhook Not Triggering

**Symptoms:**
- No emails sent when auth actions performed
- No logs in backend for webhook calls

**Solutions:**
```bash
# Check webhook registration in Supabase
curl https://pangdzwamawwgmvxnwkk.supabase.co/auth/v1/hooks \
  -H "apikey: your-service-role-key"

# Verify backend endpoint is accessible
curl https://api.visanet.app/api/v1/email/auth-hook

# Check backend logs
render logs --service visapi-backend --tail
```

#### 2. Email Not Delivered

**Symptoms:**
- Webhook triggered but no email received
- Resend API errors

**Solutions:**
```bash
# Check Resend API key
curl https://api.resend.com/emails \
  -H "Authorization: Bearer re_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@visanet.app","to":"test@example.com","subject":"Test","text":"Test"}'

# Verify environment variables
echo $RESEND_API_KEY
echo $RESEND_FROM_EMAIL

# Check email logs in backend
curl https://api.visanet.app/api/v1/logs?service=email \
  -H "X-API-Key: your-api-key"
```

#### 3. Wrong Email Template Used

**Symptoms:**
- Incorrect template for auth action
- Missing user data in emails

**Debug steps:**
```typescript
// Add logging to webhook handler
logger.info({
  webhookType: payload.type,
  userData: payload.user,
  emailData: payload.email_data
}, 'Processing auth webhook');

// Check email type mapping
switch (payload.type) {
  case 'signup':
  case 'invite':
    // Should use welcome template
    break;
  case 'magiclink':
    // Should use magic link template
    break;
  case 'recovery':
    // Should use password reset template
    break;
  case 'email_change':
    // Should use verification template
    break;
}
```

#### 4. Invalid Token or Links

**Symptoms:**
- Email links don't work
- "Invalid token" errors

**Solutions:**
```bash
# Verify redirect URLs in Supabase
# Dashboard → Authentication → URL Configuration

# Check token hash generation
# Ensure using correct token from webhook payload

# Verify frontend handles tokens correctly
# Check /auth/callback route implementation
```

### Debug Checklist

- [ ] Webhook registered in Supabase dashboard
- [ ] Backend endpoint returns 200 OK
- [ ] Environment variables correctly set
- [ ] Resend API key is valid
- [ ] Email domain verified in Resend
- [ ] Redirect URLs configured in Supabase
- [ ] Frontend callback routes implemented
- [ ] Logs show webhook received and processed
- [ ] Email templates render correctly
- [ ] Links in emails are valid and work

## Security Considerations

### 1. Webhook Authentication

Implement webhook signature verification:
```typescript
// Verify webhook is from Supabase
const verifyWebhookSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};
```

### 2. Rate Limiting

Protect webhook endpoint:
```typescript
// Apply rate limiting to webhook
@Post('auth-hook')
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 requests per minute
async handleAuthHook(@Body() payload: AuthHookPayload) {
  // Handle webhook
}
```

### 3. Input Validation

Validate all webhook payloads:
```typescript
// Use class-validator for payload validation
export class AuthHookPayloadDto {
  @IsEnum(['signup', 'magiclink', 'recovery', 'invite', 'email_change'])
  type: string;

  @IsObject()
  @ValidateNested()
  @Type(() => UserDto)
  user: UserDto;

  @IsObject()
  @ValidateNested()
  @Type(() => EmailDataDto)
  email_data: EmailDataDto;
}
```

### 4. Secure Token Handling

- Never log tokens or sensitive data
- Use secure random tokens
- Set appropriate token expiration
- Implement token rotation for long-lived sessions

### 5. Email Security

- SPF/DKIM/DMARC configured for domain
- Use TLS for email delivery
- Implement email address validation
- Monitor for email bounce rates

### 6. Access Control

```typescript
// Restrict webhook to internal use only
@Post('auth-hook')
@UseGuards(InternalOnlyGuard)
async handleAuthHook(@Body() payload: AuthHookPayload) {
  // Verify request is from Supabase IP ranges
  // or use shared secret authentication
}
```

## API Reference

### Webhook Payload Structure

```typescript
interface AuthHookPayload {
  type: 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change';
  user: {
    id: string;
    email: string;
    email_confirmed_at?: string;
    phone?: string;
    phone_confirmed_at?: string;
    confirmed_at?: string;
    last_sign_in_at?: string;
    created_at: string;
    updated_at: string;
    user_metadata: {
      full_name?: string;
      avatar_url?: string;
      [key: string]: any;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type?: string;
    site_url?: string;
    token_new?: string;
    token_hash_new?: string;
  };
}
```

### Response Format

```typescript
interface WebhookResponse {
  success: boolean;
  message: string;
  emailType?: string;
  error?: string;
  details?: any;
}
```

### Email Templates Data

```typescript
// Magic Link Email
interface MagicLinkData {
  userName: string;
  magicLink: string;
  expiresIn?: string;
}

// Welcome Email
interface WelcomeData {
  userName: string;
  loginUrl: string;
}

// Password Reset Email
interface PasswordResetData {
  userName: string;
  resetLink: string;
  expiresIn?: string;
}

// Email Verification
interface VerificationData {
  userName: string;
  verificationLink: string;
}
```

## Monitoring and Maintenance

### 1. Health Checks

Monitor webhook endpoint health:
```bash
# Add to monitoring system
curl https://api.visanet.app/api/v1/healthz
```

### 2. Email Metrics

Track in Grafana dashboard:
- Webhook success rate
- Email delivery rate
- Template usage by type
- Average processing time
- Error rates by type

### 3. Log Monitoring

Key log queries:
```sql
-- Failed webhook processing
SELECT * FROM logs 
WHERE service = 'email' 
AND level = 'error'
AND created_at > now() - interval '1 hour';

-- Email delivery stats
SELECT 
  json_extract(metadata, '$.emailType') as email_type,
  COUNT(*) as count
FROM logs
WHERE service = 'email'
AND action = 'email.sent'
GROUP BY email_type;
```

### 4. Maintenance Tasks

**Daily:**
- Check email delivery rates in Resend dashboard
- Monitor webhook error rates
- Verify no stuck emails in queue

**Weekly:**
- Review email bounce rates
- Check for outdated email addresses
- Analyze email open rates

**Monthly:**
- Update email templates if needed
- Review and rotate API keys
- Performance optimization review
- Security audit of webhook endpoint

### 5. Alerts Configuration

Set up alerts for:
- Webhook endpoint downtime
- High error rates (>5%)
- Slow email processing (>5s)
- Resend API failures
- Queue depth for email jobs

## Conclusion

The Supabase email webhook integration provides a robust, branded email experience for VisAPI users. By following this guide, you can ensure reliable email delivery with professional templates while maintaining security and monitoring capabilities.

For additional support or questions, refer to:
- [VisAPI Email Service Documentation](./email-service-guide.md)
- [Supabase Auth Hooks Documentation](https://supabase.com/docs/guides/auth/auth-hooks)
- [Resend API Documentation](https://resend.com/docs)