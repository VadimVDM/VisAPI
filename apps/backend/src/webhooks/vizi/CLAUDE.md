# Vizi Webhooks Module

Handles incoming webhooks from Vizi application and provides admin operations for order and CBB sync management.

## Endpoints

### Order Processing

- `POST /api/v1/webhooks/vizi/orders` - Receive and process Vizi order webhooks
  - Validates and normalizes incoming data
  - Creates order in database
  - Triggers CBB sync for IL branch orders
  - Queues WhatsApp notifications

### Admin Operations (Require Admin API Key)

#### Order Retrigger

- `POST /api/v1/webhooks/vizi/retrigger` - Retrigger order creation from stored webhook data
  - Modes: single order or bulk
  - Recovery tool for failed order processing
  - Supports date range filtering

#### CBB Contact Resync

- `POST /api/v1/webhooks/vizi/resync-cbb` - Manually resync CBB contact
  - Find orders by: phone number, order ID, or Vizi order ID
  - Uses same sync logic as automatic processing
  - Returns sync status and WhatsApp availability

#### WhatsApp Notification Retrigger

- `POST /api/v1/webhooks/vizi/retrigger-whatsapp` - Manually retrigger WhatsApp order confirmation
  - Find orders by: phone number, order ID, or Vizi order ID
  - Validates CBB sync status before sending
  - Force flag to override already-sent checks
  - Uses exact same message flow as automatic processing

#### Visa Approval Resend

- `POST /api/v1/webhooks/vizi/resend-visa` - Manually resend visa approval notifications
  - **Request Body**:
    ```json
    {
      "orderId": "IL250928IN7", // Required: Order ID to resend
      "phone": "+13473726179", // Optional: Override recipient phone
      "applicationIds": ["ISR-25-008315-04"] // Optional: Specific applications to resend
    }
    ```
  - **Selective Application Resend** (NEW):
    - If `applicationIds` provided, resends only specified applications
    - If `applicationIds` omitted, resends ALL applications (default behavior)
    - Application IDs from Airtable Applications table (e.g., "ISR-25-008315-04")
    - Validates requested IDs exist in order
    - Returns helpful error messages with available IDs if invalid
    - Tracks which applications were sent vs skipped
    - 100% backward compatible with existing integrations
  - **Phone Override Feature**:
    - If `phone` provided, sends to that number instead of order's phone
    - Automatically removes `+` prefix (e.g., `+13473726179` → `13473726179`)
    - CBB handles contact resolution automatically
    - Useful for testing or sending to alternate recipients
    - Works seamlessly with application filtering
  - Fetches fresh order data from Airtable with application expansion
  - Resets visa_notification_sent flag to allow unlimited resends
  - Processes up to 10 visa applications per order
  - Uses existing VisaApprovalProcessorService for WhatsApp notifications
  - Sends first visa with visa_approval_file_phone template
  - Sends visas 2-10 with visa_approval_file_multi_he template (5 sec delay)
  - **Examples**:

    ```bash
    # Resend all applications (default behavior)
    curl -X POST https://api.visanet.app/api/v1/webhooks/vizi/resend-visa \
      -H "X-API-Key: vizi_admin_..." \
      -d '{"orderId":"IL250928IN7"}'

    # Resend specific application only
    curl -X POST https://api.visanet.app/api/v1/webhooks/vizi/resend-visa \
      -H "X-API-Key: vizi_admin_..." \
      -d '{"orderId":"IL251008MA26","applicationIds":["ISR-25-008315-04"]}'

    # Resend multiple applications
    curl -X POST https://api.visanet.app/api/v1/webhooks/vizi/resend-visa \
      -H "X-API-Key: vizi_admin_..." \
      -d '{"orderId":"IL251008MA26","applicationIds":["ISR-25-008315-01","ISR-25-008315-04"]}'

    # Combine phone override + application filtering
    curl -X POST https://api.visanet.app/api/v1/webhooks/vizi/resend-visa \
      -H "X-API-Key: vizi_admin_..." \
      -d '{"orderId":"IL251008MA26","phone":"972545379663","applicationIds":["ISR-25-008315-04"]}'
    ```

## Security

All endpoints require API key authentication with appropriate scopes:

- Order webhook: `webhook:vizi` + `logs:write`
- Admin operations: `webhook:vizi` + `admin`

## Architecture

- CQRS pattern with commands for sync operations
- Repository pattern for database access
- Services split by responsibility:
  - `ViziOrderWebhookService` — request validation + idempotency handling
  - `ViziOrderWorkflowService` — workflow dispatch & logging
  - `ViziOrderRetriggerService` — historical webhook replay
  - `ViziCbbResyncService` — targeted CBB contact sync
  - `ViziWhatsAppRetriggerService` — WhatsApp queue orchestration
  - `ViziVisaResendService` — visa approval notification resending
- Full audit logging with correlation IDs
- Idempotency support via headers

**Last Updated**: November 14, 2025
