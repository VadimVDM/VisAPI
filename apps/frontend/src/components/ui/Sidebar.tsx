'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Home,
  Settings,
  FileText,
  Activity,
  Key,
  Play,
  LogOut,
  Workflow,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useRole } from '@/hooks/useRole';
import { RoleBasedComponent } from '../auth/RoleBasedComponent';
import { Button } from './button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
import { ThemeToggle } from './theme-toggle';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    permission: 'analytics:read', // Everyone with basic access can see dashboard
  },
  {
    name: 'Workflows',
    href: '/dashboard/workflows',
    icon: Workflow,
    permission: 'workflows:read',
  },
  {
    name: 'Queue',
    href: '/dashboard/queue',
    icon: Activity,
    permission: 'queue:read',
  },
  {
    name: 'Logs',
    href: '/dashboard/logs',
    icon: FileText,
    permission: 'logs:read',
  },
  {
    name: 'API Keys',
    href: '/dashboard/api-keys',
    icon: Key,
    permission: 'api-keys:read',
  },
  {
    name: 'Manual Triggers',
    href: '/dashboard/triggers',
    icon: Play,
    permission: 'workflows:execute',
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar = ({ collapsed = false, onToggle }: SidebarProps) => {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { getDisplayName } = useRole();

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      signOut();
    }
  };

  const NavigationItem = ({ item }: { item: (typeof navigation)[0] }) => {
    const isActive = pathname === item.href;

    const linkContent = (
      <Link
        href={item.href}
        className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        } ${collapsed ? 'justify-center' : ''}`}
        aria-current={isActive ? 'page' : undefined}
        aria-label={`Navigate to ${item.name}`}
      >
        <item.icon
          className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`}
          aria-hidden="true"
        />
        {!collapsed && <span>{item.name}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return linkContent;
  };

  return (
    <aside
      className={`flex flex-col bg-card border-r transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      role="complementary"
      aria-label="Sidebar navigation"
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b">
        {!collapsed && (
          <h1 className="text-foreground font-semibold text-lg">
            VisAPI Admin
          </h1>
        )}
        {onToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
        {navigation.map((item) => (
          <RoleBasedComponent
            key={item.name}
            requiredPermission={item.permission}
          >
            <NavigationItem item={item} />
          </RoleBasedComponent>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t" role="contentinfo">
        {/* Theme Toggle */}
        <div className={`mb-3 ${collapsed ? 'flex justify-center' : ''}`}>
          <ThemeToggle />
        </div>

        {/* User Info */}
        {!collapsed && (
          <div className="flex items-center mb-3 px-3 py-2 rounded-lg bg-muted/50">
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium text-foreground truncate"
                title={user?.email}
              >
                {user?.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {getDisplayName()}
              </p>
            </div>
          </div>
        )}

        {/* Sign Out */}
        <div className={collapsed ? 'flex justify-center' : ''}>
          {collapsed ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label="Sign out of your account"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Sign Out</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              aria-label="Sign out of your account"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign Out
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
};
