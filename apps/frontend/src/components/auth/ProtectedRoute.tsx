'use client';

import { ReactNode } from 'react';
import { useRole, Role } from '@/hooks/useRole';
import { UnauthorizedPage } from './UnauthorizedPage';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: Role;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean; // If true, requires ALL permissions; if false, requires ANY permission
  fallback?: ReactNode;
}

export const ProtectedRoute = ({
  children,
  requiredRole,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallback,
}: ProtectedRouteProps) => {
  const { hasRole, hasPermission, hasAllPermissions, hasAnyPermission, isAuthenticated } = useRole();

  // Check authentication first
  if (!isAuthenticated) {
    return fallback || <UnauthorizedPage message="Please login to access this page." />;
  }

  // Check role-based access
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback || <UnauthorizedPage message="You don't have permission to access this page." />;
  }

  // Check single permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback || <UnauthorizedPage message="You don't have permission to perform this action." />;
  }

  // Check multiple permissions
  if (requiredPermissions) {
    const hasAccess = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!hasAccess) {
      return fallback || <UnauthorizedPage message="You don't have the required permissions for this page." />;
    }
  }

  return <>{children}</>;
};