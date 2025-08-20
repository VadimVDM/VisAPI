import { useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@visapi/frontend-data';

export function useThemePersistence() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  // Load theme preference on mount
  useEffect(() => {
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
      }
    };

    loadThemePreference();
  }, [user?.id, setTheme]);

  // Save theme preference
  const saveThemePreference = useCallback(
    async (newTheme: string) => {
      // Save to cookie immediately for all users
      document.cookie = `theme=${newTheme}; path=/; max-age=${
        60 * 60 * 24 * 365
      }; SameSite=Lax`;

      // For authenticated users, also save to database
      if (user?.id) {
        try {
          await supabase
            .from('users')
            .update({ theme_preference: newTheme })
            .eq('id', user.id);
        } catch (error) {
          console.error('Error saving theme preference:', error);
        }
      }
    },
    [user?.id],
  );

  return { theme, setTheme, saveThemePreference };
}
