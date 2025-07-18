'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '@visapi/frontend-data';
import { ThemeToggleAnimated } from '@/components/ui/theme-toggle-animated';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const forgotPasswordSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(data: ForgotPasswordFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      // Use Supabase auth directly for password reset
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setIsEmailSent(true);
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

  const handleResendEmail = async () => {
    const currentEmail = form.getValues('email');
    if (currentEmail) {
      await onSubmit({ email: currentEmail });
    }
  };

  if (isEmailSent) {
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
              className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-xl shadow-visanet-green/25 dark:shadow-visanet-green/20"
            >
              {/* Gradient background - green for success */}
              <div className="absolute inset-0 bg-gradient-to-br from-visanet-green to-emerald-500" />
              
              {/* Subtle inner glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20" />
              
              {/* Border that works in both themes */}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 dark:ring-white/10" />
              
              {/* Icon with subtle shadow for depth */}
              <Mail className="h-8 w-8 text-white relative z-10 drop-shadow-lg" />
            </motion.div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold text-foreground">
                Check your email
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                We've sent a password reset link to{' '}
                <span className="font-medium text-foreground">
                  {form.getValues('email')}
                </span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or
              </p>
              <Button
                variant="outline"
                onClick={handleResendEmail}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Resend email
              </Button>
            </div>
            <div className="pt-4 border-t">
              <Link href="/auth/login" className="block">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </Link>
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
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-xl shadow-purple-500/25 dark:shadow-purple-500/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30">
            {/* Gradient background - purple to blue for recovery */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-visanet-blue" />
            
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20" />
            
            {/* Border that works in both themes */}
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 dark:ring-white/10" />
            
            {/* Icon with subtle shadow for depth */}
            <KeyRound className="h-8 w-8 text-white relative z-10 drop-shadow-lg" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold text-foreground">
              Forgot password?
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              No worries, we'll send you reset instructions
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="john@visanet.app"
                          className="pl-10"
                          disabled={isLoading}
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
                    Sending reset email...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send reset email
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 pt-6 border-t text-center">
            <Link href="/auth/login" className="inline-block">
              <Button variant="ghost" className="text-sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
