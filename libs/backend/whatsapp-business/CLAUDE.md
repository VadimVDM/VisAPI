# WhatsApp Business API Integration Library

Direct Meta WhatsApp Business API integration module for webhook receiving in hybrid architecture with CBB.

## Status

**Production Ready**: Webhook receiving fully operational
**Last Updated**: August 25, 2025 - Enhanced message ID correlation with race condition fix

### Implementation Progress
- ✅ Module structure created
- ✅ Service classes implemented (WhatsAppApiService, WebhookVerifierService, etc.)
- ✅ HMAC-SHA256 signature verification implemented
- ✅ Database schema created with migration
- ✅ Types and interfaces defined
- ✅ Webhook controller integration complete
- ✅ Meta credentials configured
- ✅ MessageIdUpdaterService for ID correlation

## Architecture

**Hybrid Approach**: CBB handles message sending and dashboard, WABA receives delivery webhooks

## Purpose

Provides webhook receiving from Meta's WhatsApp Business API v23.0 for enhanced delivery tracking while maintaining CBB for message sending and UI dashboard.

## Architecture

```
WhatsApp Business Module
├── WhatsAppApiService       # Direct Meta API client
├── WebhookVerifierService   # HMAC-SHA256 signature verification
├── TemplateManagerService   # Template sync & quality monitoring
├── DeliveryTrackerService   # Message status & conversation tracking
├── MessageQueueService      # BullMQ async processing
└── MessageIdUpdaterService  # Correlates temp IDs with real WAMIDs
```

## Key Features

- **Direct Meta API Integration**: Native Graph API v23.0 communication
- **Webhook Security**: HMAC-SHA256 signature verification (2025 requirement)
- **Template Management**: Quality score monitoring and synchronization
- **Conversation Tracking**: Pricing categories and billing optimization
- **Delivery Tracking**: Comprehensive status updates (sent, delivered, read, failed)
- **Message ID Correlation**: Automatic update from temp to real WAMIDs
- **Media Handling**: Upload/download with validation
- **Retry Logic**: Exponential backoff with jitter

## Database Schema

```sql
-- Core tables created (August 23, 2025)
whatsapp_webhook_events     # Webhook event tracking with signatures
whatsapp_templates          # Template management with quality scores
whatsapp_messages          # Message tracking with conversation support
whatsapp_conversations     # Conversation pricing tracking
whatsapp_template_history  # Template change audit log
whatsapp_message_retries   # Retry tracking
```

## Configuration

```bash
# Environment variables (pending real values)
WABA_PHONE_NUMBER_ID=your_phone_number_id
WABA_BUSINESS_ID=your_business_id
WABA_ACCESS_TOKEN=your_permanent_token
WABA_WEBHOOK_SECRET=your_webhook_secret
WABA_APP_SECRET=your_app_secret
WABA_WEBHOOK_VERIFY_TOKEN=your_verify_token
WABA_API_VERSION=v23.0
WHATSAPP_DASHBOARD_ENABLED=false  # Using CBB dashboard
```

## Webhook Integration

```typescript
// Webhook endpoints implemented
GET  /api/v1/webhooks/whatsapp  # Verification challenge
POST /api/v1/webhooks/whatsapp  # Event processing

// Event types supported
- messages (incoming messages)
- messages.status (delivery updates)
- message_template_status_update (template changes)
- account_alerts (business account updates)
```

## Hybrid Operation Strategy

Permanent hybrid architecture:
1. **CBB**: Message sending + WhatsApp-specific dashboard/UI
2. **WABA**: Webhook receiving for delivery tracking
3. **VisAPI Dashboard**: Main admin dashboard (separate from WhatsApp)
4. Database tracks both CBB sends and WABA webhook receipts

## Production Features

- ✅ Webhook receiving fully operational
- ✅ Enhanced message ID correlation with race condition fix
- ✅ Fallback correlation for legacy `biz_opaque_callback_data` formats
- ✅ Automatic update from temporary to real WAMIDs with retry logic
- ✅ Robust delivery status tracking with proper sequencing
- ✅ Signature verification working
- ✅ Integration with CBB sending complete
- ✅ Hybrid operation monitored and stable

## Notes

- CBB handles WhatsApp-specific dashboard/UI (not our main admin dashboard)
- Translation service integrated for Hebrew localization
- Permanent hybrid architecture (not transitional)
- Uses same database tracking columns as CBB
- Webhook forwarding to Zapier maintained
- No message processor needed (CBB handles all sending)

Last Updated: August 25, 2025