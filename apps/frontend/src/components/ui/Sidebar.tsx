'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Settings,
  FileText,
  Activity,
  Key,
  Play,
  LogOut,
  Workflow,
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Workflows', href: '/dashboard/workflows', icon: Workflow },
  { name: 'Queue', href: '/dashboard/queue', icon: Activity },
  { name: 'Logs', href: '/dashboard/logs', icon: FileText },
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
  { name: 'Manual Triggers', href: '/dashboard/triggers', icon: Play },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-col w-64 bg-gray-800">
      <div className="flex items-center h-16 px-4 bg-gray-900">
        <h1 className="text-white font-semibold text-lg">VisAPI Admin</h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center mb-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{user?.email}</p>
            <p className="text-xs text-gray-400">Admin User</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
};
