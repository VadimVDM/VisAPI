'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const passwordSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  password: z.string().min(1, {
    message: 'Password is required.',
  }),
  rememberMe: z.boolean().optional(),
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
  
  // Check if magic link method is requested via URL param
  const defaultMethod = searchParams.get('method') === 'magic-link' ? 'magic-link' : 'password';
  const [authMethod, setAuthMethod] = useState<'password' | 'magic-link'>(defaultMethod);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
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
      // TODO: Implement actual login logic with Supabase
      console.log('Login data:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
      // TODO: Implement actual magic link logic with Supabase
      console.log('Magic link data:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setMagicLinkSent(true);
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
      console.error('Magic link error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="flex justify-center mb-6">
              <Image
                src="/Visanet-Logo.svg"
                alt="Visanet"
                width={200}
                height={60}
                priority
              />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pb-4">
            {!magicLinkSent ? (
              <>
                <div className="flex rounded-lg bg-muted p-1 mb-6">
                  <button
                    type="button"
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      authMethod === 'password'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setAuthMethod('password')}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      authMethod === 'magic-link'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setAuthMethod('magic-link')}
                  >
                    Magic Link
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {authMethod === 'password' ? (
                    <motion.div
                      key="password"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
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
                                    Forgot password?
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

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="remember"
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              {...passwordForm.register('rememberMe')}
                            />
                            <label htmlFor="remember" className="text-sm text-muted-foreground">
                              Remember me for 30 days
                            </label>
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
                            className="w-full"
                            size="lg"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Signing in...
                              </>
                            ) : (
                              <>
                                Sign in
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </form>
                      </Form>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="magic-link"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Form {...magicLinkForm}>
                        <form onSubmit={magicLinkForm.handleSubmit(onMagicLinkSubmit)} className="space-y-4">
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

                          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                            <p className="text-sm text-accent-foreground flex items-center">
                              <Sparkles className="h-4 w-4 mr-2 text-accent" />
                              We'll send you a magic link to sign in instantly
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
                            className="w-full"
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
                  <div className="mx-auto w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center">
                    <Mail className="h-8 w-8 text-accent" />
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
            <CardFooter>
              <p className="text-center text-sm text-muted-foreground w-full">
                Don't have an account?{' '}
                <Link 
                  href="/auth/signup" 
                  className="font-medium text-primary hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </CardFooter>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}