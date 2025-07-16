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
