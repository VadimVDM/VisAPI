# Database Schema

This document provides an overview of the core tables in the Supabase PostgreSQL database for the VisAPI project.

## Conventions

- **Primary Keys**: All primary keys are of type `uuid` and are auto-generated.
- **Timestamps**: All tables include `created_at` and `updated_at` columns of type `timestamptz`.
  - `created_at` defaults to `now()`.
  - `updated_at` is automatically updated by a trigger on any row modification.
- **Security**: Row-Level Security (RLS) is enabled on all tables to enforce data access policies.

## Core Tables

### `users`

Stores user information for the admin dashboard.

```sql
- id: uuid (primary key)
- email: text (unique) -- DEPRECATED: Will be removed after auth.users integration
- role: enum ('viewer', 'operator', 'admin')
- auth_user_id: uuid (nullable, for future auth.users integration)
- created_at: timestamptz (NOT NULL, default now())
- updated_at: timestamptz (NOT NULL, default now(), auto-updated)
```

### `api_keys`

Manages API keys for authenticating with the backend API. Uses a secure prefix/secret pattern.

```sql
- id: uuid (primary key)
- name: text (NOT NULL)
- hashed_key: text (LEGACY - will be removed)
- prefix: text (for fast lookups, indexed)
- hashed_secret: text (bcrypt hashed, secure storage)
- scopes: text[] (default empty array)
- expires_at: timestamptz (nullable, indexed)
- created_by: uuid (foreign key to users, nullable)
- created_at: timestamptz (NOT NULL, default now())
- last_used_at: timestamptz (nullable, tracks API key usage)
- updated_at: timestamptz (NOT NULL, default now(), auto-updated)
```

### `workflows`

Defines the automated workflows.

```sql
- id: uuid (primary key)
- name: text (NOT NULL)
- description: text (nullable)
- schema: jsonb (workflow definition, NOT NULL)
- enabled: boolean (NOT NULL, default true)
- created_at: timestamptz (NOT NULL, default now())
- updated_at: timestamptz (NOT NULL, default now(), auto-updated)
```

### `logs`

Stores application logs for auditing and debugging, with a 90-day retention policy.

```sql
- id: uuid (primary key)
- level: text
- message: text
- metadata: jsonb
- workflow_id: uuid (nullable)
- job_id: text (nullable)
- pii_redacted: boolean
- created_at: timestamptz (90-day retention)
```

## Order Processing Tables

### `orders`

Stores visa order data received from n8n.visanet.app webhook.

```sql
- id: uuid (primary key)
- order_id: text (unique, external order ID e.g. "RU250731IL1")
- form_id: text (external form ID)
- payment_id: text
- payment_processor: text
- amount: numeric(10,2)
- currency: text
- coupon: text (nullable)
- status: text (default 'active')
- branch: text
- domain: text
- raw_data: jsonb (complete raw webhook data)
- created_at: timestamptz (NOT NULL, default now())
- updated_at: timestamptz (NOT NULL, default now(), auto-updated)
```

### `applicants`

Stores individual applicant information for each order.

```sql
- id: uuid (primary key)
- order_id: uuid (foreign key to orders, CASCADE DELETE)
- applicant_id: text (external applicant ID)
- passport_nationality: text
- passport_first_name: text
- passport_last_name: text
- passport_sex: text
- passport_date_of_birth: date
- passport_country_of_birth: text
- passport_number: text
- passport_date_of_issue: date
- passport_date_of_expiry: date
- passport_place_of_issue: text (for some visa types)
- past_visit_visited: boolean (default false)
- past_visit_year: text
- address_line: text
- address_city: text
- address_country: text
- occupation_education: text
- occupation_status: text
- occupation_name: text
- occupation_seniority: text
- occupation_phone: jsonb ({code, number})
- occupation_address: jsonb ({line, city, country})
- extra_nationality_status: text
- family_data: jsonb (complete family structure)
- files: jsonb (all file URLs)
- id_number: text (national ID number)
- crime: text (criminal record info)
- religion: text
- military: jsonb ({served, role, rank})
- past_travels: jsonb (complex travel history including SAARC)
- visited: boolean (default false, for Korean visas)
- city_of_birth: text (for Korean visas)
- last_travel: jsonb ({traveled, country, from, until})
- created_at: timestamptz (NOT NULL, default now())
- updated_at: timestamptz (NOT NULL, default now(), auto-updated)
```

### `form_metadata`

Stores form-level metadata for orders.

```sql
- id: uuid (primary key)
- order_id: uuid (foreign key to orders, CASCADE DELETE)
- form_id: text
- country: text
- entry_date: date
- entry_port: text (nullable)
- product: jsonb (complete product information)
- quantity: integer
- urgency: text
- client: jsonb (client information)
- meta: jsonb (form metadata - url, branch, domain, etc.)
- children: jsonb (array of children, default '[]')
- stay_address: text (address in destination country)
- created_at: timestamptz (NOT NULL, default now())
- updated_at: timestamptz (NOT NULL, default now(), auto-updated)
```

### `business_info`

Stores business information for business visa applications.

```sql
- id: uuid (primary key)
- order_id: uuid (foreign key to orders, CASCADE DELETE)
- name: text
- sector: text
- website: text
- address_line: text
- address_city: text
- address_country: text
- phone: jsonb ({code, number})
- created_at: timestamptz (NOT NULL, default now())
- updated_at: timestamptz (NOT NULL, default now(), auto-updated)
```

### `webhook_logs`

Tracks all incoming webhook requests for debugging and auditing.

```sql
- id: uuid (primary key)
- source: text (e.g., 'n8n.visanet.app')
- endpoint: text
- method: text
- headers: jsonb
- body: jsonb
- status_code: integer
- response: jsonb
- error: text
- processing_time_ms: integer
- created_at: timestamptz (NOT NULL, default now())
```
