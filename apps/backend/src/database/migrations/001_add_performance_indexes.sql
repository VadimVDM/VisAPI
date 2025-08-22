-- Performance Optimization Indexes for VisAPI
-- Generated: August 22, 2025
-- Purpose: Optimize query performance for high-traffic operations

-- Orders table performance indexes
-- Optimize finding unprocessed orders (used by queue processors)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_processed_at_null 
ON orders (created_at) 
WHERE processed_at IS NULL;

-- Optimize finding orders pending WhatsApp confirmation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_whatsapp_pending 
ON orders (created_at) 
WHERE whatsapp_alerts_enabled = true AND whatsapp_confirmation_sent IS NULL;

-- Optimize finding orders pending CBB sync (IL branch only)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_cbb_pending 
ON orders (created_at) 
WHERE cbb_synced_at IS NULL AND branch = 'il';

-- Optimize order lookups by client
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_client_email 
ON orders (client_email, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_client_phone 
ON orders (client_phone, created_at DESC);

-- Optimize branch-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_branch_created 
ON orders (branch, created_at DESC);

-- API Keys authentication index (critical path - every request)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_prefix_active 
ON api_keys (prefix) 
WHERE expires_at > NOW() OR expires_at IS NULL;

-- API Keys by creator
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_creator 
ON api_keys (created_by, created_at DESC);

-- Workflows trigger index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_enabled 
ON workflows (enabled, created_at DESC) 
WHERE enabled = true;

-- Workflows by creator
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_creator 
ON workflows (created_by, created_at DESC);

-- Logs performance indexes
-- Optimize log level filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_level_timestamp 
ON logs (level, timestamp DESC);

-- Optimize correlation ID lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_correlation_id 
ON logs (correlation_id, timestamp ASC)
WHERE correlation_id IS NOT NULL;

-- Optimize log cleanup queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_timestamp_cleanup 
ON logs (timestamp)
WHERE timestamp < NOW() - INTERVAL '30 days';

-- Users table indexes
-- Optimize user lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users (email);

-- Note: Using CONCURRENTLY to avoid locking tables during index creation
-- This is safe for production use as it doesn't block concurrent operations