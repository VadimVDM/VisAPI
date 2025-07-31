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
- prefix: text (for fast lookups, indexed, e.g., 'visapi_xxx' or 'vizi_xxx')
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
- id: bigint (primary key, auto-incrementing)
- level: text (NOT NULL)
- message: text (NOT NULL)
- metadata: jsonb (default '{}')
- workflow_id: uuid (nullable, foreign key to workflows)
- job_id: text (nullable, indexed)
- pii_redacted: boolean (default true)
- created_at: timestamptz (NOT NULL, default now(), indexed DESC)
```

## Sprint 5 Tables

### `roles`

Enhanced role-based access control system.

```sql
- id: uuid (primary key)
- name: varchar (unique, indexed)
- display_name: varchar (NOT NULL)
- description: text (nullable)
- permissions: jsonb (default '{}')
- created_at: timestamptz (NOT NULL, default now())
- updated_at: timestamptz (NOT NULL, default now(), auto-updated)
```

### `user_roles`

User-role assignments for RBAC.

```sql
- user_id: uuid (foreign key to users, composite primary key)
- role_id: uuid (foreign key to roles, composite primary key)
- assigned_at: timestamptz (NOT NULL, default now())
- assigned_by: uuid (nullable, foreign key to users)
```

## Webhook Processing Tables

### `webhook_data`

Stores incoming webhook data for processing. RLS enabled with service_role only access.

```sql
- webhook_id: uuid (primary key, default gen_random_uuid())
- type: varchar (NOT NULL)
- data: jsonb (NOT NULL)
- processed: boolean (default false)
- created_at: timestamptz (default now())
- processed_at: timestamptz (nullable)
```

## Index Summary

The database uses strategic indexes for performance:

- `api_keys`: prefix lookup, expiration filtering
- `logs`: timestamp ordering, workflow/job filtering
- `roles`: name uniqueness
- `user_roles`: user and role lookups
- `webhook_data`: type/processed status filtering

## Notes

- **Legacy tables removed**: All n8n-related tables (orders, applicants, form_metadata, business_info, webhook_logs) have been dropped as part of the Vizi webhook migration
- **Clean architecture**: Database now focuses on core VisAPI functionality: users, auth, workflows, logs, and webhook processing
- **Security first**: All tables have RLS enabled with appropriate policies
