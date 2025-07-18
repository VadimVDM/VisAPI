'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Mail, Lock, ArrowRight, Sparkles, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@visapi/frontend-data';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const passwordSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  password: z.string().min(1, {
    message: 'Password is required.',
  }),
});

const magicLinkSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
});

type PasswordFormValues = z.infer<typeof passwordSchema>;
type MagicLinkFormValues = z.infer<typeof magicLinkSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Check if magic link method is requested via URL param, but default to magic-link
  const defaultMethod =
    searchParams.get('method') === 'password' ? 'password' : 'magic-link';
  const [authMethod, setAuthMethod] = useState<'password' | 'magic-link'>(
    defaultMethod
  );

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const magicLinkForm = useForm<MagicLinkFormValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onPasswordSubmit(data: PasswordFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (!result.session) {
        setError('Failed to create session. Please try again.');
        return;
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function onMagicLinkSubmit(data: MagicLinkFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          // This will send the magic link
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      setMagicLinkSent(true);
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
      console.error('Magic link error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="shadow-xl border border-visanet-blue/10 bg-card/50 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-xl shadow-visanet-blue/25 dark:shadow-visanet-blue/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-visanet-blue/30">
            {/* Gradient background with better visibility */}
            <div className="absolute inset-0 bg-gradient-to-br from-visanet-blue to-visanet-blue/90" />
            
            
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20" />
            
            {/* Border that works in both themes */}
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 dark:ring-white/10" />
            
            {/* Icon with subtle shadow for depth */}
            <LogIn className="h-8 w-8 text-white relative z-10 drop-shadow-lg" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold text-foreground">
              Welcome back
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Login to continue to the Visanet API
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-4">
          {!magicLinkSent ? (
            <>
              <div className="relative flex rounded-xl bg-gradient-to-r from-muted/40 to-muted/60 p-1.5 mb-6 border border-border/50 backdrop-blur-sm shadow-inner">
                <motion.div
                  className="absolute inset-1.5 rounded-lg"
                  initial={false}
                  animate={{
                    x: authMethod === 'magic-link' ? 0 : '100%',
                    background:
                      authMethod === 'magic-link'
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow:
                      authMethod === 'magic-link'
                        ? '0 2px 8px rgba(16, 185, 129, 0.15), 0 1px 3px rgba(16, 185, 129, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                        : '0 2px 8px rgba(59, 130, 246, 0.15), 0 1px 3px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8,
                  }}
                  style={{
                    width: 'calc(50% - 3px)',
                  }}
                />
                <button
                  type="button"
                  className={`relative flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ease-out transform ${
                    authMethod === 'magic-link'
                      ? 'text-white z-10 scale-[1.02] shadow-lg'
                      : 'text-muted-foreground hover:text-foreground hover:scale-[1.01] z-0'
                  }`}
                  onClick={() => setAuthMethod('magic-link')}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      scale: authMethod === 'magic-link' ? 1 : 0.98,
                      y: authMethod === 'magic-link' ? 0 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Sparkles
                      className={`h-4 w-4 transition-all duration-300 ${
                        authMethod === 'magic-link'
                          ? 'text-white'
                          : 'text-emerald-600'
                      }`}
                    />
                    Magic Link
                  </motion.div>
                </button>
                <button
                  type="button"
                  className={`relative flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ease-out transform ${
                    authMethod === 'password'
                      ? 'text-white z-10 scale-[1.02] shadow-lg'
                      : 'text-muted-foreground hover:text-foreground hover:scale-[1.01] z-0'
                  }`}
                  onClick={() => setAuthMethod('password')}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      scale: authMethod === 'password' ? 1 : 0.98,
                      y: authMethod === 'password' ? 0 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Lock
                      className={`h-4 w-4 transition-all duration-300 ${
                        authMethod === 'password'
                          ? 'text-white'
                          : 'text-blue-600'
                      }`}
                    />
                    Password
                  </motion.div>
                </button>
              </div>

              <AnimatePresence mode="wait">
                {authMethod === 'magic-link' ? (
                  <motion.div
                    key="magic-link"
                    initial={{ opacity: 0, x: -30, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 30, scale: 0.95 }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 20,
                      mass: 0.8,
                      opacity: { duration: 0.2 },
                    }}
                  >
                    <Form {...magicLinkForm}>
                      <form
                        onSubmit={magicLinkForm.handleSubmit(onMagicLinkSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={magicLinkForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
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

                        <div className="magic-link-notification border border-emerald-200 dark:border-emerald-800/30 rounded-lg p-3">
                          <p className="text-sm text-foreground flex items-center">
                            <Sparkles className="h-4 w-4 mr-2 text-emerald-600" />
                            We'll send you a magic link to login instantly
                          </p>
                        </div>

                        {error && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-destructive/10 text-destructive text-sm p-3 rounded-md"
                          >
                            {error}
                          </motion.div>
                        )}

                        <Button
                          type="submit"
                          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold shadow-lg shadow-emerald-600/20 border border-emerald-600/20"
                          size="lg"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending magic link...
                            </>
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              Send magic link
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="password"
                    initial={{ opacity: 0, x: -30, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 30, scale: 0.95 }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 20,
                      mass: 0.8,
                      opacity: { duration: 0.2 },
                    }}
                  >
                    <Form {...passwordForm}>
                      <form
                        onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={passwordForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
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

                        <FormField
                          control={passwordForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Password</FormLabel>
                                <Link
                                  href="/auth/forgot-password"
                                  className="text-sm text-primary hover:underline"
                                >
                                  Forgot your password?
                                </Link>
                              </div>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="password"
                                    placeholder="••••••••"
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

                        {error && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-destructive/10 text-destructive text-sm p-3 rounded-md"
                          >
                            {error}
                          </motion.div>
                        )}

                        <Button
                          type="submit"
                          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg shadow-blue-600/20 border border-blue-600/20"
                          size="lg"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Logging in...
                            </>
                          ) : (
                            <>
                              Login
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center relative overflow-hidden shadow-xl shadow-visanet-green/25 dark:shadow-visanet-green/20">
                  {/* Gradient background - green for success */}
                  <div className="absolute inset-0 bg-gradient-to-br from-visanet-green to-emerald-500" />
                  
                  {/* Subtle inner glow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20" />
                  
                  {/* Border that works in both themes */}
                  <div className="absolute inset-0 rounded-full ring-1 ring-white/20 dark:ring-white/10" />
                  
                  {/* Icon with subtle shadow for depth */}
                  <Mail className="h-8 w-8 text-white relative z-10 drop-shadow-lg" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Check your email</h3>
              <p className="text-sm text-muted-foreground mb-6">
                We've sent a magic link to {magicLinkForm.getValues('email')}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setMagicLinkSent(false);
                  setError(null);
                }}
              >
                Try another email
              </Button>
            </motion.div>
          )}
        </CardContent>

        {!magicLinkSent && (
          <CardFooter className="flex flex-col space-y-4">
            <div className="w-full border-t" />
            <Link href="/auth/signup" className="block w-full">
              <Button variant="ghost" className="w-full justify-center">
                <span>Don't have an account? Create account</span>
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-visanet-blue" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
