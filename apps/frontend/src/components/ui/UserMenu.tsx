'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useRole } from '@/hooks/useRole';

export const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const { getDisplayName } = useRole();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, []);

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      signOut();
    }
    setIsOpen(false);
  };

  if (!user) return null;

  // Get user initials for avatar
  const getInitials = (email: string) => {
    const name = email.split('@')[0];
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 p-2 hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
      >
        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
          {getInitials(user.email || '')}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-900 truncate max-w-32">
            {user.email?.split('@')[0]}
          </div>
          <div className="text-xs text-gray-500">{getDisplayName()}</div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu"
        >
          <div className="py-1" role="none">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900" role="none">
                {user.email}
              </p>
              <p className="text-xs text-gray-500" role="none">
                {getDisplayName()}
              </p>
            </div>

            {/* Menu Items */}
            <button
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <User className="mr-3 h-4 w-4" aria-hidden="true" />
              Profile
            </button>

            <button
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="mr-3 h-4 w-4" aria-hidden="true" />
              Settings
            </button>

            <div className="border-t border-gray-200" role="none">
              <button
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                role="menuitem"
                onClick={handleSignOut}
              >
                <LogOut className="mr-3 h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
