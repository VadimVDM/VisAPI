'use client';

import { useAuth } from '@/components/auth/AuthProvider';

// Role hierarchy levels (higher number = more permissions)
export const ROLE_LEVELS = {
  analytics: 1,    // Read-only access to metrics, logs, and reports
  support: 2,      // View logs, trigger workflows, basic monitoring
  developer: 3,    // Create/edit workflows, API key management, view logs  
  manager: 4,      // Workflow management, analytics, team oversight
  admin: 5,        // Full system access, user management, all features
} as const;

export type Role = keyof typeof ROLE_LEVELS;

export interface Permission {
  action: string;
  resource: string;
}

// Permission definitions based on backend RBAC system
export const PERMISSIONS = {
  // Workflow permissions
  'workflows:read': ['analytics', 'support', 'developer', 'manager', 'admin'],
  'workflows:create': ['developer', 'manager', 'admin'],
  'workflows:update': ['developer', 'manager', 'admin'],
  'workflows:delete': ['manager', 'admin'],
  'workflows:execute': ['support', 'developer', 'manager', 'admin'],

  // API Key permissions
  'api-keys:read': ['developer', 'manager', 'admin'],
  'api-keys:create': ['developer', 'manager', 'admin'],
  'api-keys:update': ['developer', 'manager', 'admin'],
  'api-keys:delete': ['manager', 'admin'],

  // Logs permissions
  'logs:read': ['analytics', 'support', 'developer', 'manager', 'admin'],
  'logs:delete': ['admin'],

  // Queue permissions
  'queue:read': ['support', 'developer', 'manager', 'admin'],
  'queue:manage': ['developer', 'manager', 'admin'],

  // User management permissions
  'users:read': ['manager', 'admin'],
  'users:create': ['admin'],
  'users:update': ['admin'],
  'users:delete': ['admin'],

  // Analytics permissions
  'analytics:read': ['analytics', 'support', 'developer', 'manager', 'admin'],
  'analytics:export': ['developer', 'manager', 'admin'],

  // System permissions
  'system:settings': ['admin'],
  'system:monitoring': ['manager', 'admin'],
} as const;

export const useRole = () => {
  const { user } = useAuth();

  // TODO: Get actual role from user metadata or API call
  // For now, defaulting to 'admin' since backend assigns default roles
  const userRole: Role = 'admin'; // This should come from user.user_metadata.role or API

  const hasRole = (requiredRole: Role): boolean => {
    return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
  };

  const hasPermission = (permission: string): boolean => {
    const allowedRoles = PERMISSIONS[permission as keyof typeof PERMISSIONS];
    if (!allowedRoles) return false;
    
    return allowedRoles.includes(userRole);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const getRoleLevel = (): number => {
    return ROLE_LEVELS[userRole];
  };

  const getRoleName = (): string => {
    return userRole.charAt(0).toUpperCase() + userRole.slice(1);
  };

  const getDisplayName = (): string => {
    const roleNames = {
      analytics: 'Analytics User',
      support: 'Support User', 
      developer: 'Developer',
      manager: 'Manager',
      admin: 'Admin User',
    };
    return roleNames[userRole];
  };

  return {
    userRole,
    hasRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getRoleLevel,
    getRoleName,
    getDisplayName,
    isAuthenticated: !!user,
  };
};