# VisAPI Error Codes Reference

RFC 7807 Problem Details implementation with standardized error codes.

## Error Response Format

All API errors follow RFC 7807 Problem Details specification:

```json
{
  "type": "https://api.visanet.app/problems/invalid-api-key",
  "title": "Invalid API Key",
  "status": 401,
  "detail": "The provided API key is invalid or expired",
  "instance": "/api/v1/orders",
  "correlationId": "req-123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2025-08-24T23:33:10.123Z",
  "code": "AUTH-001"
}
```

### Response Fields

| Field           | Type   | Description                          |
| --------------- | ------ | ------------------------------------ |
| `type`          | string | URI identifying the problem type     |
| `title`         | string | Short human-readable problem summary |
| `status`        | number | HTTP status code                     |
| `detail`        | string | Human-readable explanation           |
| `instance`      | string | URI of the specific occurrence       |
| `correlationId` | string | Request tracing ID                   |
| `timestamp`     | string | ISO 8601 timestamp                   |
| `code`          | string | Application-specific error code      |
| `errors`        | object | Validation errors (optional)         |

## Error Code Categories

### Authentication & Authorization (AUTH-xxx)

| Code     | HTTP | Title                    | Description                        |
| -------- | ---- | ------------------------ | ---------------------------------- |
| AUTH-001 | 401  | Invalid API Key          | API key is invalid or expired      |
| AUTH-002 | 403  | Insufficient Permissions | API key lacks required permissions |
| AUTH-003 | 429  | Rate Limit Exceeded      | Too many requests from API key     |
| AUTH-004 | 401  | Session Expired          | Authentication session has expired |

### Validation (VAL-xxx)

| Code    | HTTP | Title                    | Description                                  |
| ------- | ---- | ------------------------ | -------------------------------------------- |
| VAL-001 | 400  | Invalid Request Body     | Request body contains invalid/missing fields |
| VAL-002 | 400  | Invalid Query Parameters | One or more query parameters are invalid     |
| VAL-003 | 400  | Invalid Path Parameters  | One or more path parameters are invalid      |
| VAL-004 | 422  | Schema Validation Failed | Request data doesn't match required schema   |

### Resources (RES-xxx)

| Code    | HTTP | Title                       | Description                      |
| ------- | ---- | --------------------------- | -------------------------------- |
| RES-001 | 404  | Order Not Found             | Requested order doesn't exist    |
| RES-002 | 404  | Workflow Not Found          | Requested workflow doesn't exist |
| RES-003 | 404  | User Not Found              | Requested user doesn't exist     |
| RES-004 | 404  | WhatsApp Template Not Found | Requested template doesn't exist |

### Business Logic (BIZ-xxx)

| Code    | HTTP | Title                           | Description                            |
| ------- | ---- | ------------------------------- | -------------------------------------- |
| BIZ-001 | 409  | Order Already Processed         | Order already processed, cannot modify |
| BIZ-002 | 422  | Invalid Order Status Transition | Status change not allowed              |
| BIZ-003 | 502  | CBB Synchronization Failed      | Failed to sync with CBB system         |
| BIZ-004 | 502  | WhatsApp Message Failed         | Failed to send WhatsApp message        |
| BIZ-005 | 422  | Template Not Approved           | WhatsApp template not approved by Meta |
| BIZ-006 | 409  | Duplicate Order                 | Order with this ID already exists      |

### External Services (EXT-xxx)

| Code    | HTTP | Title                      | Description                            |
| ------- | ---- | -------------------------- | -------------------------------------- |
| EXT-001 | 503  | Database Connection Failed | Unable to connect to database          |
| EXT-002 | 503  | Cache Service Unavailable  | Unable to connect to cache service     |
| EXT-003 | 400  | Invalid Vizi Webhook       | Vizi webhook payload invalid/malformed |
| EXT-004 | 502  | WhatsApp API Error         | Error with WhatsApp Business API       |
| EXT-005 | 502  | CBB API Error              | Error communicating with CBB API       |

### System (SYS-xxx)

| Code    | HTTP | Title                  | Description                        |
| ------- | ---- | ---------------------- | ---------------------------------- |
| SYS-001 | 500  | Internal Server Error  | Unexpected error occurred          |
| SYS-002 | 503  | Service Unavailable    | Service temporarily unavailable    |
| SYS-003 | 504  | Request Timeout        | Request timed out while processing |
| SYS-004 | 500  | Queue Processing Error | Error in background job processing |

## Usage Examples

### Client Error Handling

```typescript
interface ApiErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  correlationId?: string;
}

// Handle specific error codes
if (error.code === 'AUTH-001') {
  // Redirect to login
  redirectToLogin();
} else if (error.code === 'AUTH-003') {
  // Show rate limit message
  showRateLimitMessage(error.detail);
} else if (error.code.startsWith('VAL-')) {
  // Show validation errors
  showValidationErrors(error.errors);
}
```

### Monitoring & Alerting

- **Client Errors (4xx)**: Log as warnings for monitoring user experience
- **Server Errors (5xx)**: Log as errors with full stack traces and alert on-call
- **Rate Limits**: Monitor AUTH-003 for potential abuse
- **External Services**: Alert on EXT-xxx codes for service dependencies

### Support & Debugging

All errors include a `correlationId` for request tracing:

```bash
# Search logs by correlation ID
grep "req-123e4567-e89b-12d3-a456-426614174000" /var/log/visapi/*.log

# Find error in Grafana
{correlationId="req-123e4567-e89b-12d3-a456-426614174000"}
```

## Implementation Details

- Error codes defined in `apps/backend/src/common/constants/error-codes.ts`
- Global exception filter in `apps/backend/src/common/filters/global-exception.filter.ts`
- TypeScript types in `libs/backend/http-types/src/lib/http.types.ts`
- Content-Type: `application/problem+json` per RFC 7807
- All responses include correlation headers for tracing

---

**Last Updated**: August 24, 2025
