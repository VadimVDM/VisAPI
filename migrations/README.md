# Database Migrations

Centralized database migrations for VisAPI.

## Migration Naming Convention

Migrations are numbered sequentially with descriptive names:
- `001_add_performance_indexes.sql`
- `002_create_orders_tables.sql`
- `003_create_roles_tables.sql`
- etc.

## Running Migrations

### Local Development
```bash
pnpm migrate:up    # Apply all pending migrations
pnpm migrate:down  # Rollback last migration
pnpm migrate:status # Check migration status
```

### Production
Migrations are automatically applied during deployment via CI/CD pipeline.

## Migration Files

| File | Description |
|------|-------------|
| 001_add_performance_indexes.sql | Performance indexes for queries |
| 002_create_orders_tables.sql | Main orders table structure |
| 003_create_roles_tables.sql | RBAC roles and permissions |
| 004_add_additional_order_fields.sql | Additional order fields |
| 005_add_vizi_webhook_scope.sql | Vizi webhook API scope |
| 006_add_korean_visa_fields.sql | Korean visa specific fields |
| 007_add_saudi_and_uk_fields.sql | Saudi and UK visa fields |
| 008_whatsapp_business_api_tables.sql | WhatsApp Business API integration |
| 009_processing_rules_tables.sql | Business rules for processing times |

## Creating New Migrations

1. Create a new SQL file with the next sequential number
2. Include both UP and DOWN migrations (if applicable)
3. Test locally before committing
4. Document the migration purpose in this README