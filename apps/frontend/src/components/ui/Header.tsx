'use client';

import { Bell, Search } from 'lucide-react';
import { UserMenu } from './UserMenu';

export const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center">
          <h2 id="page-title" className="text-xl font-semibold text-gray-900">Dashboard</h2>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative" role="search">
            <label htmlFor="search-input" className="sr-only">Search</label>
            <input
              id="search-input"
              type="text"
              placeholder="Search..."
              aria-label="Search"
              aria-describedby="search-hint"
              className="pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
            <div id="search-hint" className="sr-only">Search through your workflows, logs, and API keys</div>
          </div>

          <button 
            className="p-2 text-gray-400 hover:text-gray-600 relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-md"
            aria-label="Notifications (1 unread)"
            aria-describedby="notification-count"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span 
              className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"
              aria-hidden="true"
            ></span>
            <span id="notification-count" className="sr-only">1 unread notification</span>
          </button>

          <UserMenu />
        </div>
      </div>
    </header>
  );
};
