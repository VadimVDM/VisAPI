# VisAPI Data Flow Diagram

## System Architecture Overview

This document provides a comprehensive data flow diagram for the VisAPI enterprise workflow automation system, including all external services, trust boundaries, and security zones.

## High-Level System Architecture

```mermaid
graph TB
    subgraph "External Users & Services"
        U[External Users]
        WH[Webhook Sources]
        SLACK[Slack Workspace]
        WHATSAPP[WhatsApp/CGB API]
        EMAIL[Email Recipients]
    end

    subgraph "Trust Boundary: CDN/Edge"
        CDN[Vercel CDN]
    end

    subgraph "Trust Boundary: Application Layer"
        subgraph "Frontend Zone"
            FE[Next.js Frontend<br/>app.visanet.app]
        end

        subgraph "Backend Zone"
            API[NestJS API Gateway<br/>api.visanet.app]
            WORKER[BullMQ Workers<br/>Render]
            QUEUE[Queue Processor]
        end
    end

    subgraph "Trust Boundary: Data Layer"
        subgraph "Database Zone"
            DB[(Supabase PostgreSQL)]
            STORAGE[Supabase Storage]
        end

        subgraph "Cache Zone"
            REDIS[(Upstash Redis)]
        end
    end

    subgraph "Trust Boundary: External Services"
        RESEND[Resend Email API]
        PROMETHEUS[Grafana Cloud]
        GITHUB[GitHub Actions]
    end

    %% Data Flows
    U -->|HTTPS| CDN
    CDN -->|Static Assets| FE
    FE -->|Magic Link Auth| DB
    FE -->|API Requests| API
    WH -->|Webhook POST| API
    API -->|Queue Jobs| REDIS
    API -->|Read/Write| DB
    API -->|Store Files| STORAGE
    REDIS -->|Job Processing| WORKER
    WORKER -->|Slack Messages| SLACK
    WORKER -->|WhatsApp Messages| WHATSAPP
    WORKER -->|Send Emails| RESEND
    WORKER -->|Update Status| DB
    API -->|Metrics| PROMETHEUS
    GITHUB -->|Deploy| API
    GITHUB -->|Deploy| FE

    %% Styling
    classDef external fill:#ffe6e6,stroke:#cc0000,stroke-width:2px
    classDef trusted fill:#e6ffe6,stroke:#00cc00,stroke-width:2px
    classDef sensitive fill:#fff2e6,stroke:#ff8800,stroke-width:2px

    class U,WH,SLACK,WHATSAPP,EMAIL external
    class FE,API,WORKER,QUEUE trusted
    class DB,STORAGE,REDIS sensitive
```

## Detailed Data Flow Analysis

### 1. User Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant SB as Supabase Auth
    participant DB as Database

    U->>FE: Access app.visanet.app
    FE->>SB: Magic Link Request
    SB->>U: Email with Magic Link
    U->>SB: Click Magic Link
    SB->>DB: Validate User (@visanet.com)
    DB-->>SB: User Profile
    SB-->>FE: JWT Token
    FE->>FE: Store JWT in httpOnly cookie
    FE->>DB: Authenticated API calls
```

### 2. API Key Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Gateway
    participant GUARD as ApiKeyGuard
    participant DB as Database

    C->>API: Request with X-API-Key header
    API->>GUARD: Extract API key
    GUARD->>GUARD: Parse prefix/secret
    GUARD->>DB: Query api_keys table
    DB-->>GUARD: Hashed secret + metadata
    GUARD->>GUARD: bcrypt.compare(secret, hash)
    alt Valid Key
        GUARD-->>API: User context + permissions
        API->>API: Process request
    else Invalid Key
        GUARD-->>API: 401 Unauthorized
    end
```

### 3. Webhook Processing Flow

```mermaid
sequenceDiagram
    participant WH as Webhook Source
    participant API as API Gateway
    participant IDEMPOTENCY as Idempotency Check
    participant QUEUE as Redis Queue
    participant WORKER as BullMQ Worker
    participant DB as Database

    WH->>API: POST /api/v1/triggers/{key}
    API->>IDEMPOTENCY: Check X-Idempotency-Key
    IDEMPOTENCY->>DB: Query processed_webhooks
    DB-->>IDEMPOTENCY: Status (new/processed)

    alt New Request
        IDEMPOTENCY->>QUEUE: Add job to queue
        QUEUE->>WORKER: Process job
        WORKER->>DB: Update workflow status
        WORKER->>API: Job completion
        API-->>WH: 200 OK
    else Duplicate Request
        IDEMPOTENCY-->>API: Return cached response
        API-->>WH: 200 OK (cached)
    end
```

### 4. Queue Processing Flow

```mermaid
sequenceDiagram
    participant QUEUE as Redis Queue
    participant WORKER as BullMQ Worker
    participant SLACK as Slack API
    participant WHATSAPP as WhatsApp/CGB
    participant RESEND as Resend Email
    participant DB as Database
    participant STORAGE as Supabase Storage

    QUEUE->>WORKER: Job received
    WORKER->>DB: Load workflow definition
    DB-->>WORKER: Workflow steps

    loop For each step
        alt Slack notification
            WORKER->>SLACK: Send message
        else WhatsApp message
            WORKER->>WHATSAPP: Send via CGB API
        else Email notification
            WORKER->>RESEND: Send email
        else PDF generation
            WORKER->>WORKER: Generate PDF
            WORKER->>STORAGE: Store PDF
        end

        WORKER->>DB: Update step status
    end

    WORKER->>DB: Mark workflow complete
```

## Data Classification & Security Zones

### Data Classification

| Classification   | Examples                         | Security Requirements     |
| ---------------- | -------------------------------- | ------------------------- |
| **Public**       | API documentation, health checks | Standard HTTPS            |
| **Internal**     | System metrics, logs             | Authenticated access      |
| **Confidential** | User data, workflow configs      | Encrypted at rest/transit |
| **Restricted**   | API keys, secrets                | Hashed/encrypted storage  |

### Security Zones

#### 1. DMZ (Demilitarized Zone)

- **Components**: CDN, Load Balancers
- **Purpose**: Public-facing layer
- **Security**: DDoS protection, rate limiting

#### 2. Application Zone

- **Components**: Frontend, API Gateway, Workers
- **Purpose**: Business logic processing
- **Security**: Authentication, authorization, input validation

#### 3. Data Zone

- **Components**: Database, Redis, File Storage
- **Purpose**: Data persistence and caching
- **Security**: Encryption at rest, network isolation

#### 4. External Services Zone

- **Components**: Slack, WhatsApp, Resend, Grafana
- **Purpose**: Third-party integrations
- **Security**: API key management, rate limiting

## Trust Boundaries

### Boundary 1: Internet → CDN

- **Protection**: DDoS mitigation, geographic filtering
- **Validation**: Valid TLS certificates, HSTS headers

### Boundary 2: CDN → Application

- **Protection**: Origin validation, rate limiting
- **Validation**: Request signing, origin IP allowlist

### Boundary 3: Application → Data

- **Protection**: Connection pooling, query parameterization
- **Validation**: SQL injection prevention, input sanitization

### Boundary 4: Application → External Services

- **Protection**: API key rotation, request signing
- **Validation**: Response validation, timeout handling

## Network Security

### HTTPS/TLS Configuration

- **Minimum TLS**: 1.2 (preferred 1.3)
- **Cipher Suites**: Modern, secure ciphers only
- **HSTS**: Enabled with max-age=31536000
- **Certificate Pinning**: Implemented for critical services

### CORS Configuration

```javascript
{
  origin: ['https://app.visanet.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
}
```

## Monitoring & Logging Data Flows

### Metrics Collection

```mermaid
flowchart LR
    APP[Application] -->|Prometheus metrics| COLLECTOR[Metrics Collector]
    COLLECTOR -->|Push| GRAFANA[Grafana Cloud]
    GRAFANA -->|Alerts| SLACK[Slack Alerts]
```

### Log Aggregation

```mermaid
flowchart LR
    APP[Application] -->|Structured logs| STDOUT[stdout]
    STDOUT -->|Render logs| GRAFANA[Grafana Cloud]
    GRAFANA -->|Search/Filter| DASHBOARD[Log Dashboard]
```

## Security Controls Summary

| Component     | Authentication    | Authorization      | Encryption | Monitoring         |
| ------------- | ----------------- | ------------------ | ---------- | ------------------ |
| Frontend      | Supabase Auth     | Role-based         | HTTPS/TLS  | Page views         |
| API Gateway   | API Keys          | Scoped permissions | HTTPS/TLS  | Request metrics    |
| Database      | Connection string | RLS policies       | At rest    | Query logs         |
| Redis         | AUTH token        | None               | In transit | Connection metrics |
| External APIs | API keys          | Service-specific   | HTTPS/TLS  | API call logs      |

## Data Retention & Privacy

### Data Retention Policies

- **Application logs**: 30 days
- **Workflow data**: 1 year
- **Metrics data**: 90 days
- **Audit logs**: 7 years

### PII Handling

- **Redaction**: Automatic PII redaction in logs
- **Encryption**: AES-256 for PII at rest
- **Access Control**: Role-based access to PII
- **Audit Trail**: All PII access logged

## Compliance Considerations

### GDPR Compliance

- **Data Subject Rights**: Export/delete capabilities
- **Consent Management**: Opt-in/opt-out mechanisms
- **Data Portability**: API endpoints for data export
- **Breach Notification**: Automated alerting systems

### SOC 2 Preparation

- **Access Controls**: Multi-factor authentication
- **Change Management**: Git-based deployments
- **Monitoring**: Comprehensive logging and metrics
- **Incident Response**: Automated alerting and procedures

---

**Last Updated**: July 16, 2025  
**Version**: 1.0  
**Author**: Security Team  
**Review Date**: August 16, 2025
