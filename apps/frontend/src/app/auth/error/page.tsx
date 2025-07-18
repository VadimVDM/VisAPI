'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Suspense } from 'react';
import { ThemeToggleAnimated } from '@/components/ui/theme-toggle-animated';
import { VisanetLogo } from '@/components/ui/visanet-logo';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'An authentication error occurred';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-visanet-blue/5 via-background to-visanet-green/5 px-4 py-12">
      <ThemeToggleAnimated />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border border-visanet-blue/10 bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="flex justify-center mb-6">
              <VisanetLogo height={48} width={128} className="h-12 w-auto" />
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
              className="mb-6"
            >
              <div className="mx-auto w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center border border-destructive/30">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </motion.div>
            <CardTitle className="text-2xl font-bold text-destructive">
              Authentication Error
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              We encountered an issue with your authentication
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-8">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-destructive-foreground">{error}</p>
            </div>

            <div className="space-y-3">
              <Button
                asChild
                className="w-full bg-gradient-to-r from-visanet-blue to-visanet-blue/90 hover:from-visanet-blue/90 hover:to-visanet-blue/80 text-white font-semibold shadow-lg shadow-visanet-blue/25 border border-visanet-blue/20"
                size="lg"
              >
                <Link href="/auth/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full" size="lg">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Homepage
                </Link>
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                If this issue persists, please contact support at{' '}
                <a
                  href="mailto:support@visanet.app"
                  className="text-primary hover:underline"
                >
                  support@visanet.app
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-visanet-blue/5 via-background to-visanet-green/5">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-visanet-blue border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
