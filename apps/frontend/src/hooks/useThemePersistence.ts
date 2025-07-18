import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@visapi/frontend-data';

export function useThemePersistence() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    // Load theme preference on mount
    const loadThemePreference = async () => {
      // For authenticated users, load from database
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('theme_preference')
            .eq('id', user.id)
            .single();

          if (data?.theme_preference && !error) {
            setTheme(data.theme_preference);
          }
        } catch (error) {
          console.error('Error loading theme preference:', error);
        }
      } else {
        // For non-authenticated users, load from cookie
        const savedTheme = document.cookie
          .split('; ')
          .find((row) => row.startsWith('theme='))
          ?.split('=')[1];

        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setTheme(savedTheme);
        }
      }
    };

    loadThemePreference();
  }, [user?.id, setTheme]);

  useEffect(() => {
    // Save theme preference when it changes
    const saveThemePreference = async () => {
      if (!theme) return;

      // For authenticated users, save to database
      if (user?.id) {
        try {
          await supabase
            .from('users')
            .update({ theme_preference: theme })
            .eq('id', user.id);
        } catch (error) {
          console.error('Error saving theme preference:', error);
        }
      }

      // Always save to cookie for immediate effect and non-auth users
      document.cookie = `theme=${theme}; path=/; max-age=${
        60 * 60 * 24 * 365
      }; SameSite=Lax`;
    };

    saveThemePreference();
  }, [theme, user?.id]);

  return { theme, setTheme };
}
