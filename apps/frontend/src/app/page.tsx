'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@visapi/frontend-data';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // User is authenticated, redirect to dashboard
          router.replace('/dashboard');
        } else {
          // User is not authenticated, redirect to login
          router.replace('/auth/login');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        // On error, redirect to login as a safe default
        router.replace('/auth/login');
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  // Show loading state while checking auth and redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}