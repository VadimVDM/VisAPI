'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useThemePersistence } from '@/hooks/useThemePersistence';
import { motion, AnimatePresence } from 'framer-motion';

export function ThemeToggleAnimated() {
  const { theme, setTheme } = useThemePersistence();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = React.useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';

    // Check if View Transitions API is supported
    if (!document.startViewTransition) {
      setTheme(newTheme);
      return;
    }

    // Use View Transitions API for smooth theme transition
    document.startViewTransition(() => {
      setTheme(newTheme);
    });
  }, [theme, setTheme]);

  if (!mounted) {
    return (
      <div className="fixed bottom-8 right-8 z-50">
        <div className="h-14 w-14 rounded-full bg-muted/50 backdrop-blur-sm" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleTheme}
        className={`
          relative h-14 w-14 rounded-full
          bg-gradient-to-br
          ${
            theme === 'light'
              ? 'from-blue-400 to-blue-600 shadow-lg shadow-blue-500/25'
              : 'from-slate-800 to-slate-900 shadow-lg shadow-slate-900/50'
          }
          border border-white/20
          backdrop-blur-sm
          transition-all duration-300
          hover:border-white/30
          group
          overflow-hidden
        `}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      >
        {/* Background animation */}
        <div
          className={`
            absolute inset-0 rounded-full
            bg-gradient-to-t from-transparent
            ${theme === 'light' ? 'to-white/20' : 'to-white/10'}
            opacity-0 group-hover:opacity-100
            transition-opacity duration-300
          `}
        />

        {/* Icon container with animation */}
        <div className="relative h-full w-full flex items-center justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {theme === 'light' ? (
              <motion.div
                key="sun"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{
                  duration: 0.3,
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                }}
              >
                <Sun className="h-6 w-6 text-white drop-shadow-md" />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -180 }}
                transition={{
                  duration: 0.3,
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                }}
              >
                <Moon className="h-6 w-6 text-white drop-shadow-md" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Ripple effect on click */}
        <motion.div
          className={`
            absolute inset-0 rounded-full
            ${theme === 'light' ? 'bg-white/30' : 'bg-white/20'}
          `}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 0, opacity: 0 }}
          whileTap={{ scale: 2, opacity: [0, 1, 0] }}
          transition={{ duration: 0.6 }}
        />
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 0, y: 10, scale: 0.9 }}
          whileHover={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-full right-0 mb-2 pointer-events-none"
        >
          <div className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg whitespace-nowrap">
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
            <div className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 dark:bg-gray-700" />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
