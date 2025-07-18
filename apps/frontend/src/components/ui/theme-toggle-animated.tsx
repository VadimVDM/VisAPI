'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemePersistence } from '@/hooks/useThemePersistence';

export function ThemeToggleAnimated() {
  const { theme, setTheme } = useTheme();
  const { saveThemePreference } = useThemePersistence();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeToggle = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const newTheme = theme === 'light' ? 'dark' : 'light';

      // Get click position for animation
      const xPosition = `${(event.clientX / window.innerWidth) * 100}%`;
      const yPosition = `${(event.clientY / window.innerHeight) * 100}%`;

      // Set CSS variable for animation origin
      document.documentElement.style.setProperty('--theme-toggle-x', xPosition);
      document.documentElement.style.setProperty('--theme-toggle-y', yPosition);

      // Check if View Transitions API is supported
      if (!document.startViewTransition) {
        setTheme(newTheme);
        saveThemePreference(newTheme);
        return;
      }

      // Add view transition name to root element
      document.documentElement.style.viewTransitionName = 'theme-transition';

      // Use View Transitions API for smooth theme transition
      document.startViewTransition(() => {
        setTheme(newTheme);
        saveThemePreference(newTheme);
      });
    },
    [theme, setTheme, saveThemePreference]
  );

  if (!mounted) {
    return (
      <button
        className="fixed bottom-8 right-8 z-50 h-12 w-12 rounded-full bg-muted/50 backdrop-blur-sm"
        aria-label="Theme toggle loading"
      />
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleThemeToggle}
      className={`
        fixed bottom-8 right-8 z-50
        h-12 w-12 rounded-full
        bg-gradient-to-br backdrop-blur-sm
        border-2 transition-all duration-300
        ${
          theme === 'light'
            ? 'from-blue-50 to-blue-100 border-blue-200 hover:border-blue-300 shadow-lg shadow-blue-200/50'
            : 'from-slate-800 to-slate-900 border-slate-700 hover:border-slate-600 shadow-lg shadow-slate-900/50'
        }
        flex items-center justify-center
        group overflow-hidden
      `}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div
          className={`
            absolute inset-0 rounded-full blur-xl
            ${theme === 'light' ? 'bg-blue-400/20' : 'bg-blue-600/20'}
          `}
        />
      </div>

      {/* Icon container */}
      <div className="relative z-10">
        <AnimatePresence mode="wait" initial={false}>
          {theme === 'light' ? (
            <motion.div
              key="sun"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{
                duration: 0.2,
                ease: 'easeInOut',
              }}
            >
              <Sun className="h-5 w-5 text-blue-600" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ scale: 0, rotate: 90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -90 }}
              transition={{
                duration: 0.2,
                ease: 'easeInOut',
              }}
            >
              <Moon className="h-5 w-5 text-blue-400" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ripple effect */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 0, opacity: 0 }}
        whileTap={{
          scale: [0, 1.5],
          opacity: [0.5, 0],
        }}
        transition={{ duration: 0.6 }}
        style={{
          background:
            theme === 'light'
              ? 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(147, 197, 253, 0.3) 0%, transparent 70%)',
        }}
      />
    </motion.button>
  );
}
