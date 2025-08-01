'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCcw,
} from 'lucide-react';
import { supabase } from '@visapi/frontend-data';
import { ThemeToggleAnimated } from '@/components/ui/theme-toggle-animated';

import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(12, {
        message: 'Password must be at least 12 characters.',
      })
      .regex(/[A-Z]/, {
        message: 'Password must contain at least one uppercase letter.',
      })
      .regex(/[a-z]/, {
        message: 'Password must contain at least one lowercase letter.',
      })
      .regex(/[0-9]/, {
        message: 'Password must contain at least one number.',
      })
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/, {
        message: 'Password must contain at least one symbol (!@#$%^&*...).',
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    // Check if we have the required parameters from Supabase
    const accessToken = searchParams.get('access_token');
    const tokenType = searchParams.get('token_type');
    const type = searchParams.get('type');

    if (!accessToken || tokenType !== 'bearer' || type !== 'recovery') {
      setTokenValid(false);
      setError(
        'Invalid or expired reset link. Please request a new password reset.'
      );
      return;
    }

    setTokenValid(true);
  }, [searchParams]);

  async function onSubmit(data: ResetPasswordFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      // Update password using Supabase auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setIsSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login?message=Password updated successfully');
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.'
      );
      console.error('Reset password error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle invalid token
  if (tokenValid === false) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border border-visanet-blue/10 bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-4 text-center pb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
              className="mx-auto p-3 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-600/5 dark:from-red-500/20 dark:to-red-600/10 backdrop-blur-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
            </motion.div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold text-foreground">
                Invalid Reset Link
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                This password reset link is invalid or has expired
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <Link href="/auth/forgot-password" className="block">
                <Button
                  className="w-full bg-gradient-to-r from-visanet-blue to-visanet-blue/90 hover:from-visanet-blue/90 hover:to-visanet-blue/80 text-white font-semibold shadow-lg shadow-visanet-blue/25 border border-visanet-blue/20"
                  size="lg"
                >
                  Request New Reset Link
                </Button>
              </Link>
              <Link href="/auth/login" className="block">
                <Button variant="outline" className="w-full" size="lg">
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border border-visanet-blue/10 bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-4 text-center pb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
              className="mx-auto p-3 rounded-2xl bg-gradient-to-br from-visanet-green/10 to-emerald-500/5 dark:from-visanet-green/20 dark:to-emerald-500/10 backdrop-blur-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-visanet-green to-emerald-500 flex items-center justify-center shadow-lg shadow-visanet-green/20">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
            </motion.div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold text-foreground">
                Password Updated!
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Your password has been successfully updated
              </CardDescription>
              <p className="text-sm text-muted-foreground">
                Redirecting to login in a few seconds...
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/auth/login">
              <Button
                className="w-full bg-gradient-to-r from-visanet-blue to-visanet-blue/90 hover:from-visanet-blue/90 hover:to-visanet-blue/80 text-white font-semibold shadow-lg shadow-visanet-blue/25 border border-visanet-blue/20"
                size="lg"
              >
                Continue to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Loading state while checking token
  if (tokenValid === null) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border border-visanet-blue/10 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-visanet-blue" />
              <span className="text-sm text-muted-foreground">
                Validating reset link...
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <Card className="shadow-xl border border-visanet-blue/10 bg-card/50 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto p-3 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <RefreshCcw className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold text-foreground">
              Set new password
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Your new password must be different from previously used passwords
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="••••••••••••"
                        disabled={isLoading}
                        showGenerator={true}
                        showStrengthIndicator={true}
                        showRequirements={true}
                        generatorLength={14}
                        onPasswordChange={(password) => {
                          field.onChange(password);
                          form.trigger('newPassword');
                        }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <PasswordInput
                          placeholder="••••••••••••"
                          className="pl-10"
                          disabled={isLoading}
                          showGenerator={false}
                          showStrengthIndicator={false}
                          showRequirements={false}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-destructive/10 text-destructive text-sm p-3 rounded-md"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-visanet-blue to-visanet-blue/90 hover:from-visanet-blue/90 hover:to-visanet-blue/80 text-white font-semibold shadow-lg shadow-visanet-blue/25 border border-visanet-blue/20"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 pt-6 border-t text-center">
            <Link href="/auth/login" className="inline-block">
              <Button variant="ghost" className="text-sm">
                Back to login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Loading component for Suspense fallback
function ResetPasswordLoading() {
  return (
    <div className="flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-visanet-blue" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Main page component with Suspense wrapper
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
