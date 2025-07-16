# VisAPI Security Architecture Diagrams

## Overview

This document contains comprehensive security architecture diagrams for the VisAPI system, including threat modeling visualizations, authentication flows, and security zone mappings.

## System Security Architecture

### Security Zones and Trust Boundaries

```mermaid
graph TB
    subgraph "Internet (Untrusted)"
        INTERNET[Internet Users]
        ATTACKERS[Potential Attackers]
        WEBHOOKS[Webhook Sources]
    end

    subgraph "DMZ (Demilitarized Zone)"
        CDN[Vercel CDN]
        LB[Load Balancer]
        WAF[Web Application Firewall]
    end

    subgraph "Application Zone (Semi-Trusted)"
        subgraph "Frontend Tier"
            FE[Next.js Frontend<br/>app.visanet.app]
        end

        subgraph "API Tier"
            API[NestJS API Gateway<br/>api.visanet.app]
            WORKERS[BullMQ Workers]
            QUEUE[Queue Manager]
        end
    end

    subgraph "Data Zone (Trusted)"
        subgraph "Database Tier"
            DB[(Supabase PostgreSQL<br/>RLS Enabled)]
            STORAGE[Supabase Storage<br/>Encrypted]
        end

        subgraph "Cache Tier"
            REDIS[(Upstash Redis<br/>TLS + AUTH)]
        end
    end

    subgraph "External Services (Controlled)"
        SLACK[Slack API]
        WHATSAPP[WhatsApp/CGB API]
        RESEND[Resend Email API]
        MONITORING[Grafana Cloud]
    end

    %% Trust Boundary Connections
    INTERNET -->|HTTPS| CDN
    CDN -->|Static Assets| FE
    CDN -->|API Requests| WAF
    WAF -->|Filtered Requests| API

    %% Internal Connections
    FE -->|Auth + API| API
    API -->|Job Queue| REDIS
    API -->|Data Access| DB
    API -->|File Storage| STORAGE
    REDIS -->|Job Processing| WORKERS
    WORKERS -->|Status Updates| DB

    %% External Service Connections
    WORKERS -->|Notifications| SLACK
    WORKERS -->|Messages| WHATSAPP
    WORKERS -->|Emails| RESEND
    API -->|Metrics| MONITORING

    %% Styling
    classDef untrusted fill:#ffcccc,stroke:#cc0000,stroke-width:2px
    classDef dmz fill:#ffffcc,stroke:#cccc00,stroke-width:2px
    classDef application fill:#ccffcc,stroke:#00cc00,stroke-width:2px
    classDef data fill:#ccccff,stroke:#0000cc,stroke-width:2px
    classDef external fill:#ffccff,stroke:#cc00cc,stroke-width:2px

    class INTERNET,ATTACKERS,WEBHOOKS untrusted
    class CDN,LB,WAF dmz
    class FE,API,WORKERS,QUEUE application
    class DB,STORAGE,REDIS data
    class SLACK,WHATSAPP,RESEND,MONITORING external
```

### Authentication and Authorization Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant CDN as Vercel CDN
    participant API as API Gateway
    participant AUTH as AuthGuard
    participant DB as Database
    participant REDIS as Redis Queue

    Note over U,REDIS: User Authentication Flow

    U->>FE: Access app.visanet.app
    FE->>CDN: Request static assets
    CDN-->>FE: Serve cached assets

    FE->>API: Magic link auth request
    API->>DB: Validate @visanet.com domain
    DB-->>API: Domain validation result
    API->>U: Send magic link email

    U->>API: Click magic link
    API->>DB: Validate magic link token
    DB-->>API: User profile + permissions
    API-->>FE: JWT token (httpOnly cookie)

    Note over U,REDIS: API Request Flow

    U->>FE: Make admin request
    FE->>API: Request with JWT cookie
    API->>AUTH: Validate JWT token
    AUTH->>DB: Check user permissions
    DB-->>AUTH: Permission validation
    AUTH-->>API: User context
    API->>DB: Execute authorized query
    DB-->>API: Query result
    API-->>FE: Response data
    FE-->>U: Updated UI

    Note over U,REDIS: External API Request Flow

    participant EXT as External Client
    EXT->>API: Request with X-API-Key header
    API->>AUTH: Extract API key
    AUTH->>AUTH: Parse prefix/secret
    AUTH->>DB: Query api_keys table
    DB-->>AUTH: Hashed secret + scope
    AUTH->>AUTH: bcrypt.compare()

    alt Valid API Key
        AUTH-->>API: User context + scope
        API->>REDIS: Queue job (if authorized)
        REDIS-->>API: Job queued
        API-->>EXT: 200 OK
    else Invalid API Key
        AUTH-->>API: 401 Unauthorized
        API-->>EXT: 401 Error
    end
```

### Threat Model Visualization

```mermaid
graph TB
    subgraph "STRIDE Threat Analysis"
        subgraph "Spoofing Threats"
            S1[S1: Session Hijacking]
            S2[S2: API Key Spoofing]
            S3[S3: Database Auth Bypass]
            S4[S4: Queue Poisoning]
        end

        subgraph "Tampering Threats"
            T1[T1: Client Code Tampering]
            T2[T2: Request Tampering]
            T3[T3: SQL Injection]
            T4[T4: Job Tampering]
        end

        subgraph "Repudiation Threats"
            R1[R1: Action Repudiation]
            R2[R2: Log Tampering]
        end

        subgraph "Information Disclosure"
            I1[I1: Client Data Exposure]
            I2[I2: Unauthorized Data Access]
            I3[I3: Data Exfiltration]
            I4[I4: Queue Content Exposure]
        end

        subgraph "Denial of Service"
            D1[D1: Frontend DDoS]
            D2[D2: API Rate Limiting Bypass]
            D3[D3: Database Overload]
            D4[D4: Queue Flooding]
        end

        subgraph "Elevation of Privilege"
            E1[E1: Privilege Escalation]
            E2[E2: Container Escape]
            E3[E3: Infrastructure Compromise]
        end
    end

    %% Risk Level Styling
    classDef critical fill:#ff9999,stroke:#cc0000,stroke-width:3px
    classDef high fill:#ffcc99,stroke:#ff6600,stroke-width:2px
    classDef medium fill:#ffff99,stroke:#cccc00,stroke-width:2px
    classDef low fill:#ccffcc,stroke:#00cc00,stroke-width:1px

    class I2,I3 critical
    class S1,S2,T2,T3,D2,D4,E1 high
    class T1,R1,I1,I4,D1,D3,E2 medium
    class S3,S4,T4,R2,E3 low
```

### Security Controls Matrix

```mermaid
graph LR
    subgraph "Security Controls"
        subgraph "Preventive Controls"
            P1[Authentication<br/>& Authorization]
            P2[Input Validation<br/>& Sanitization]
            P3[Encryption<br/>At Rest & Transit]
            P4[Rate Limiting<br/>& DDoS Protection]
            P5[Access Control<br/>& RBAC]
        end

        subgraph "Detective Controls"
            D1[Security Monitoring<br/>& Logging]
            D2[Anomaly Detection<br/>& Alerts]
            D3[Vulnerability<br/>Scanning]
            D4[Audit Logging<br/>& Correlation]
            D5[Performance<br/>Monitoring]
        end

        subgraph "Corrective Controls"
            C1[Incident Response<br/>Procedures]
            C2[Automated<br/>Remediation]
            C3[Backup & Recovery<br/>Systems]
            C4[Security Patches<br/>& Updates]
            C5[Configuration<br/>Management]
        end
    end

    subgraph "System Components"
        FE[Frontend]
        API[API Gateway]
        DB[Database]
        QUEUE[Queue System]
        EXT[External Services]
    end

    %% Control Application
    P1 --> FE
    P1 --> API
    P2 --> API
    P3 --> DB
    P3 --> QUEUE
    P4 --> API
    P5 --> DB

    D1 --> API
    D1 --> DB
    D2 --> API
    D3 --> FE
    D3 --> API
    D4 --> API
    D5 --> API

    C1 --> API
    C2 --> API
    C3 --> DB
    C4 --> FE
    C4 --> API
    C5 --> API

    %% Styling
    classDef preventive fill:#ccffcc,stroke:#00cc00,stroke-width:2px
    classDef detective fill:#ffffcc,stroke:#cccc00,stroke-width:2px
    classDef corrective fill:#ffcccc,stroke:#cc0000,stroke-width:2px
    classDef component fill:#ccccff,stroke:#0000cc,stroke-width:2px

    class P1,P2,P3,P4,P5 preventive
    class D1,D2,D3,D4,D5 detective
    class C1,C2,C3,C4,C5 corrective
    class FE,API,DB,QUEUE,EXT component
```

### Network Security Architecture

```mermaid
graph TB
    subgraph "Internet"
        USERS[Users]
        BOTS[Malicious Bots]
        SERVICES[External Services]
    end

    subgraph "Perimeter Security"
        DDOS[DDoS Protection]
        WAF[Web Application Firewall]
        CDN[Content Delivery Network]
        RATE[Rate Limiting]
    end

    subgraph "Application Network"
        subgraph "Frontend Subnet"
            FE[Next.js Frontend<br/>HTTPS Only]
        end

        subgraph "API Subnet"
            API[NestJS API<br/>TLS 1.3]
            WORKERS[BullMQ Workers<br/>Internal Only]
        end
    end

    subgraph "Data Network"
        subgraph "Database Subnet"
            DB[PostgreSQL<br/>Encrypted Connections]
            STORAGE[Object Storage<br/>Encrypted at Rest]
        end

        subgraph "Cache Subnet"
            REDIS[Redis<br/>TLS + AUTH]
        end
    end

    %% Network Flows
    USERS -->|HTTPS| DDOS
    BOTS -->|HTTP/HTTPS| DDOS
    SERVICES -->|API Calls| DDOS

    DDOS -->|Filtered| WAF
    WAF -->|Clean Traffic| CDN
    CDN -->|Cached/Proxied| RATE

    RATE -->|Rate Limited| FE
    RATE -->|Rate Limited| API

    FE -->|Authenticated| API
    API -->|SQL/TLS| DB
    API -->|TLS| REDIS
    API -->|HTTPS| STORAGE

    REDIS -->|Jobs| WORKERS
    WORKERS -->|Updates| DB

    %% Security Annotations
    DDOS -.->|Blocks| BOTS
    WAF -.->|Filters| BOTS
    RATE -.->|Limits| BOTS

    %% Styling
    classDef internet fill:#ffe6e6,stroke:#cc0000,stroke-width:2px
    classDef perimeter fill:#fff2e6,stroke:#ff8800,stroke-width:2px
    classDef application fill:#e6ffe6,stroke:#00cc00,stroke-width:2px
    classDef data fill:#e6e6ff,stroke:#0000cc,stroke-width:2px
    classDef security fill:#f0f0f0,stroke:#666666,stroke-width:1px,stroke-dasharray: 5 5

    class USERS,BOTS,SERVICES internet
    class DDOS,WAF,CDN,RATE perimeter
    class FE,API,WORKERS application
    class DB,STORAGE,REDIS data
```

### Data Flow Security Analysis

```mermaid
graph TB
    subgraph "Data Classification"
        subgraph "Public Data"
            PUB1[API Documentation]
            PUB2[Health Endpoints]
            PUB3[Error Messages]
        end

        subgraph "Internal Data"
            INT1[System Metrics]
            INT2[Application Logs]
            INT3[Performance Data]
        end

        subgraph "Confidential Data"
            CONF1[User Profiles]
            CONF2[Workflow Configs]
            CONF3[Business Logic]
        end

        subgraph "Restricted Data"
            REST1[API Keys]
            REST2[Database Secrets]
            REST3[Encryption Keys]
        end
    end

    subgraph "Security Controls by Data Type"
        subgraph "Public Controls"
            PUBC1[Standard HTTPS]
            PUBC2[Basic Rate Limiting]
            PUBC3[CDN Caching]
        end

        subgraph "Internal Controls"
            INTC1[Authentication Required]
            INTC2[Access Logging]
            INTC3[Data Retention]
        end

        subgraph "Confidential Controls"
            CONFC1[Encryption in Transit]
            CONFC2[Encryption at Rest]
            CONFC3[Role-Based Access]
        end

        subgraph "Restricted Controls"
            RESTC1[Hashing/Salting]
            RESTC2[Key Management]
            RESTC3[Audit Logging]
        end
    end

    %% Data Flow Mappings
    PUB1 --> PUBC1
    PUB2 --> PUBC2
    PUB3 --> PUBC3

    INT1 --> INTC1
    INT2 --> INTC2
    INT3 --> INTC3

    CONF1 --> CONFC1
    CONF2 --> CONFC2
    CONF3 --> CONFC3

    REST1 --> RESTC1
    REST2 --> RESTC2
    REST3 --> RESTC3

    %% Styling
    classDef public fill:#e6ffe6,stroke:#00cc00,stroke-width:2px
    classDef internal fill:#ffffcc,stroke:#cccc00,stroke-width:2px
    classDef confidential fill:#ffcc99,stroke:#ff6600,stroke-width:2px
    classDef restricted fill:#ff9999,stroke:#cc0000,stroke-width:3px

    class PUB1,PUB2,PUB3,PUBC1,PUBC2,PUBC3 public
    class INT1,INT2,INT3,INTC1,INTC2,INTC3 internal
    class CONF1,CONF2,CONF3,CONFC1,CONFC2,CONFC3 confidential
    class REST1,REST2,REST3,RESTC1,RESTC2,RESTC3 restricted
```

### Security Incident Response Flow

```mermaid
graph TB
    subgraph "Detection Phase"
        D1[Automated Monitoring]
        D2[Manual Discovery]
        D3[External Notification]
        D4[User Report]
    end

    subgraph "Assessment Phase"
        A1[Initial Triage]
        A2[Impact Assessment]
        A3[Scope Analysis]
        A4[Classification]
    end

    subgraph "Response Phase"
        R1[Immediate Containment]
        R2[Investigation]
        R3[Evidence Collection]
        R4[Root Cause Analysis]
    end

    subgraph "Recovery Phase"
        REC1[System Restoration]
        REC2[Service Recovery]
        REC3[Monitoring Enhancement]
        REC4[Validation Testing]
    end

    subgraph "Post-Incident"
        P1[Lessons Learned]
        P2[Process Improvement]
        P3[Security Enhancement]
        P4[Documentation Update]
    end

    %% Flow Connections
    D1 --> A1
    D2 --> A1
    D3 --> A1
    D4 --> A1

    A1 --> A2
    A2 --> A3
    A3 --> A4

    A4 --> R1
    R1 --> R2
    R2 --> R3
    R3 --> R4

    R4 --> REC1
    REC1 --> REC2
    REC2 --> REC3
    REC3 --> REC4

    REC4 --> P1
    P1 --> P2
    P2 --> P3
    P3 --> P4

    %% Severity Classifications
    A4 -.-> CRITICAL[P0: Critical<br/>Data breach, system compromise]
    A4 -.-> HIGH[P1: High<br/>Service disruption, auth bypass]
    A4 -.-> MEDIUM[P2: Medium<br/>Performance degradation]
    A4 -.-> LOW[P3: Low<br/>Policy violations]

    %% Styling
    classDef detection fill:#e6f3ff,stroke:#0066cc,stroke-width:2px
    classDef assessment fill:#fff2e6,stroke:#ff8800,stroke-width:2px
    classDef response fill:#ffe6e6,stroke:#cc0000,stroke-width:2px
    classDef recovery fill:#e6ffe6,stroke:#00cc00,stroke-width:2px
    classDef postincident fill:#f0e6ff,stroke:#8800cc,stroke-width:2px
    classDef severity fill:#f5f5f5,stroke:#666666,stroke-width:1px

    class D1,D2,D3,D4 detection
    class A1,A2,A3,A4 assessment
    class R1,R2,R3,R4 response
    class REC1,REC2,REC3,REC4 recovery
    class P1,P2,P3,P4 postincident
    class CRITICAL,HIGH,MEDIUM,LOW severity
```

### Supply Chain Security Analysis

```mermaid
graph TB
    subgraph "Development Environment"
        DEV1[Developer Workstation]
        DEV2[IDE & Tools]
        DEV3[Local Dependencies]
    end

    subgraph "Source Code Management"
        SCM1[GitHub Repository]
        SCM2[Branch Protection]
        SCM3[Code Reviews]
        SCM4[Signed Commits]
    end

    subgraph "Build Pipeline"
        BUILD1[GitHub Actions]
        BUILD2[Dependency Scanning]
        BUILD3[SAST Analysis]
        BUILD4[Container Building]
    end

    subgraph "Deployment Pipeline"
        DEPLOY1[Artifact Verification]
        DEPLOY2[Environment Config]
        DEPLOY3[Infrastructure Deploy]
        DEPLOY4[Health Checks]
    end

    subgraph "Production Environment"
        PROD1[Runtime Security]
        PROD2[Monitoring]
        PROD3[Incident Response]
        PROD4[Updates & Patches]
    end

    subgraph "External Dependencies"
        EXT1[npm Packages]
        EXT2[Docker Images]
        EXT3[Cloud Services]
        EXT4[Third-party APIs]
    end

    %% Security Controls
    DEV1 -.-> SEC1[Workstation Security]
    DEV2 -.-> SEC2[Tool Verification]
    DEV3 -.-> SEC3[Local Scanning]

    SCM1 -.-> SEC4[Repository Security]
    SCM2 -.-> SEC5[Access Control]
    SCM3 -.-> SEC6[Peer Review]
    SCM4 -.-> SEC7[Commit Signing]

    BUILD1 -.-> SEC8[Pipeline Security]
    BUILD2 -.-> SEC9[Vuln Scanning]
    BUILD3 -.-> SEC10[Static Analysis]
    BUILD4 -.-> SEC11[Container Security]

    DEPLOY1 -.-> SEC12[Artifact Integrity]
    DEPLOY2 -.-> SEC13[Config Security]
    DEPLOY3 -.-> SEC14[Infra Security]
    DEPLOY4 -.-> SEC15[Health Validation]

    EXT1 -.-> SEC16[Package Scanning]
    EXT2 -.-> SEC17[Image Security]
    EXT3 -.-> SEC18[Service Security]
    EXT4 -.-> SEC19[API Security]

    %% Flow Connections
    DEV1 --> SCM1
    SCM1 --> BUILD1
    BUILD1 --> DEPLOY1
    DEPLOY1 --> PROD1

    EXT1 --> DEV3
    EXT2 --> BUILD4
    EXT3 --> DEPLOY3
    EXT4 --> PROD1

    %% Styling
    classDef development fill:#e6f3ff,stroke:#0066cc,stroke-width:2px
    classDef scm fill:#f0e6ff,stroke:#8800cc,stroke-width:2px
    classDef build fill:#fff2e6,stroke:#ff8800,stroke-width:2px
    classDef deploy fill:#ffe6e6,stroke:#cc0000,stroke-width:2px
    classDef production fill:#e6ffe6,stroke:#00cc00,stroke-width:2px
    classDef external fill:#ffffe6,stroke:#cccc00,stroke-width:2px
    classDef security fill:#f5f5f5,stroke:#666666,stroke-width:1px,stroke-dasharray: 5 5

    class DEV1,DEV2,DEV3 development
    class SCM1,SCM2,SCM3,SCM4 scm
    class BUILD1,BUILD2,BUILD3,BUILD4 build
    class DEPLOY1,DEPLOY2,DEPLOY3,DEPLOY4 deploy
    class PROD1,PROD2,PROD3,PROD4 production
    class EXT1,EXT2,EXT3,EXT4 external
    class SEC1,SEC2,SEC3,SEC4,SEC5,SEC6,SEC7,SEC8,SEC9,SEC10,SEC11,SEC12,SEC13,SEC14,SEC15,SEC16,SEC17,SEC18,SEC19 security
```

## Security Metrics Dashboard

### Real-time Security Monitoring

```mermaid
graph LR
    subgraph "Data Sources"
        API[API Gateway Logs]
        DB[Database Logs]
        QUEUE[Queue Metrics]
        INFRA[Infrastructure Metrics]
        EXT[External Service Logs]
    end

    subgraph "Processing Layer"
        COLLECTOR[Log Collector]
        PARSER[Log Parser]
        ENRICHER[Data Enricher]
        CORRELATOR[Event Correlator]
    end

    subgraph "Analytics Engine"
        ANOMALY[Anomaly Detection]
        PATTERN[Pattern Recognition]
        THREAT[Threat Intelligence]
        SCORING[Risk Scoring]
    end

    subgraph "Alerting System"
        RULES[Alert Rules]
        ESCALATION[Escalation Logic]
        NOTIFICATION[Notification System]
        DASHBOARD[Security Dashboard]
    end

    %% Data Flow
    API --> COLLECTOR
    DB --> COLLECTOR
    QUEUE --> COLLECTOR
    INFRA --> COLLECTOR
    EXT --> COLLECTOR

    COLLECTOR --> PARSER
    PARSER --> ENRICHER
    ENRICHER --> CORRELATOR

    CORRELATOR --> ANOMALY
    CORRELATOR --> PATTERN
    CORRELATOR --> THREAT
    CORRELATOR --> SCORING

    ANOMALY --> RULES
    PATTERN --> RULES
    THREAT --> RULES
    SCORING --> RULES

    RULES --> ESCALATION
    ESCALATION --> NOTIFICATION
    ESCALATION --> DASHBOARD

    %% Styling
    classDef datasource fill:#e6f3ff,stroke:#0066cc,stroke-width:2px
    classDef processing fill:#fff2e6,stroke:#ff8800,stroke-width:2px
    classDef analytics fill:#ffe6e6,stroke:#cc0000,stroke-width:2px
    classDef alerting fill:#e6ffe6,stroke:#00cc00,stroke-width:2px

    class API,DB,QUEUE,INFRA,EXT datasource
    class COLLECTOR,PARSER,ENRICHER,CORRELATOR processing
    class ANOMALY,PATTERN,THREAT,SCORING analytics
    class RULES,ESCALATION,NOTIFICATION,DASHBOARD alerting
```

---

**Last Updated**: July 16, 2025  
**Version**: 1.0  
**Author**: Security Team  
**Review Date**: August 16, 2025

**Usage Notes**:

- These diagrams are created using Mermaid syntax
- They can be rendered in GitHub, GitLab, or any Mermaid-compatible viewer
- Update diagrams when system architecture changes
- Use these diagrams during security reviews and threat modeling sessions
