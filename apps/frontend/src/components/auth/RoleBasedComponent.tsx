'use client';

import { ReactNode } from 'react';
import { useRole, Role } from '@/hooks/useRole';

interface RoleBasedComponentProps {
  children: ReactNode;
  requiredRole?: Role;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean; // If true, requires ALL permissions; if false, requires ANY permission
  fallback?: ReactNode;
  showFallback?: boolean; // If true, shows fallback when access denied; if false, renders nothing
}

export const RoleBasedComponent = ({
  children,
  requiredRole,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallback = null,
  showFallback = false,
}: RoleBasedComponentProps) => {
  const {
    hasRole,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isAuthenticated,
  } = useRole();

  // Check authentication first
  if (!isAuthenticated) {
    return showFallback ? fallback : null;
  }

  // Check role-based access
  if (requiredRole && !hasRole(requiredRole)) {
    return showFallback ? fallback : null;
  }

  // Check single permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return showFallback ? fallback : null;
  }

  // Check multiple permissions
  if (requiredPermissions) {
    const hasAccess = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!hasAccess) {
      return showFallback ? fallback : null;
    }
  }

  return <>{children}</>;
};

// Convenience components for common use cases
export const AdminOnly = ({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => (
  <RoleBasedComponent requiredRole="admin" fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

export const ManagerOrAbove = ({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => (
  <RoleBasedComponent requiredRole="manager" fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

export const DeveloperOrAbove = ({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => (
  <RoleBasedComponent requiredRole="developer" fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

export const SupportOrAbove = ({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => (
  <RoleBasedComponent requiredRole="support" fallback={fallback}>
    {children}
  </RoleBasedComponent>
);
