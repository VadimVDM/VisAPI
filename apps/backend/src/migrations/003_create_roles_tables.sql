-- Migration: Create roles and user_roles tables for RBAC
-- Sprint 5: Frontend Excellence - Role Management
-- Created: July 17, 2025

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id, role_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_roles_name ON roles(name);

-- Insert default roles
INSERT INTO roles (name, display_name, description, permissions) VALUES
('admin', 'Administrator', 'Full system access with all permissions', 
  '{"users": ["read", "write", "delete"], "workflows": ["read", "write", "delete"], "api_keys": ["read", "write", "delete"], "logs": ["read", "write", "delete"], "analytics": ["read"], "settings": ["read", "write"]}'::jsonb),

('manager', 'Manager', 'Workflow management and team oversight', 
  '{"users": ["read"], "workflows": ["read", "write"], "api_keys": ["read"], "logs": ["read"], "analytics": ["read"], "settings": ["read"]}'::jsonb),

('developer', 'Developer', 'Create and manage workflows and API keys', 
  '{"workflows": ["read", "write"], "api_keys": ["read", "write"], "logs": ["read"], "analytics": ["read"]}'::jsonb),

('support', 'Support', 'View logs and trigger workflows', 
  '{"workflows": ["read", "trigger"], "logs": ["read"], "analytics": ["read"]}'::jsonb),

('analytics', 'Analytics', 'Read-only access to metrics and reports', 
  '{"workflows": ["read"], "logs": ["read"], "analytics": ["read"]}'::jsonb);

-- Enable RLS on new tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for roles table (read-only for all authenticated users)
CREATE POLICY "roles_read_policy" ON roles
  FOR SELECT USING (true);

-- RLS policies for user_roles table
CREATE POLICY "user_roles_read_own_policy" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_roles_admin_policy" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Update trigger for roles table
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND r.permissions->p_resource ? p_action
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get user roles
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TABLE(role_name TEXT, display_name TEXT, permissions JSONB) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name, r.display_name, r.permissions
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate existing users to new role system
-- Map old enum roles to new roles
INSERT INTO user_roles (user_id, role_id)
SELECT 
  u.id as user_id,
  r.id as role_id
FROM users u
JOIN roles r ON 
  CASE u.role
    WHEN 'admin' THEN r.name = 'admin'
    WHEN 'operator' THEN r.name = 'manager'
    WHEN 'viewer' THEN r.name = 'analytics'
  END
WHERE u.role IS NOT NULL;

-- Add comment to document the migration
COMMENT ON TABLE roles IS 'Sprint 5: Enhanced role-based access control system';
COMMENT ON TABLE user_roles IS 'Sprint 5: User-role assignments for RBAC';