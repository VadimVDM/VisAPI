'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Loader2,
  Mail,
  Lock,
  User,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@visapi/frontend-data';
import { ThemeToggleAnimated } from '@/components/ui/theme-toggle-animated';
import { UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Form,
  FormControl,
  FormDescription,
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

const signupSchema = z.object({
  fullName: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  password: z
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
});

const magicLinkSignupSchema = z.object({
  fullName: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
});

type SignupFormValues = z.infer<typeof signupSchema>;
type MagicLinkSignupFormValues = z.infer<typeof magicLinkSignupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailDomainWarning, setShowEmailDomainWarning] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Default to magic link method
  const [signupMethod, setSignupMethod] = useState<'magic-link' | 'password'>(
    'magic-link'
  );

  // Allowed email domains (should match backend configuration)
  const allowedDomains = [
    'visanet.app',
    'visanet.co',
    'visanet.co.il',
    'visanet.ru',
    'visanet.se',
  ];

  // Function to check if email domain is valid
  const validateEmailDomain = (email: string) => {
    if (!email.includes('@')) {
      setShowEmailDomainWarning(false);
      return;
    }

    const domain = email.split('@')[1];
    if (!domain) {
      setShowEmailDomainWarning(false);
      return;
    }

    const isValidDomain = allowedDomains.includes(domain.toLowerCase());
    setShowEmailDomainWarning(!isValidDomain);
  };

  const passwordForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const magicLinkForm = useForm<MagicLinkSignupFormValues>({
    resolver: zodResolver(magicLinkSignupSchema),
    defaultValues: {
      fullName: '',
      email: '',
    },
  });

  async function onPasswordSubmit(data: SignupFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!result.user) {
        setError('Failed to create account. Please try again.');
        return;
      }

      // Show success message - user needs to check email
      router.push(
        '/auth/login?method=magic-link&email=' + encodeURIComponent(data.email)
      );
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function onMagicLinkSubmit(data: MagicLinkSignupFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password:
          Math.random().toString(36).slice(-8) +
          Math.random().toString(36).slice(-8), // Generate temporary password
        options: {
          data: {
            full_name: data.fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setMagicLinkSent(true);
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
      console.error('Magic link signup error:', err);
    } finally {
      setIsLoading(false);
    }
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
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-visanet-blue/20 to-visanet-green/20 rounded-2xl flex items-center justify-center shadow-lg shadow-visanet-blue/10">
            <UserPlus className="h-8 w-8 text-visanet-blue" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold text-foreground">
              Create your account
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Get started with VisAPI in seconds
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
                    x: signupMethod === 'magic-link' ? 0 : '100%',
                    background:
                      signupMethod === 'magic-link'
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow:
                      signupMethod === 'magic-link'
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
                    signupMethod === 'magic-link'
                      ? 'text-white z-10 scale-[1.02] shadow-lg'
                      : 'text-muted-foreground hover:text-foreground hover:scale-[1.01] z-0'
                  }`}
                  onClick={() => setSignupMethod('magic-link')}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      scale: signupMethod === 'magic-link' ? 1 : 0.98,
                      y: signupMethod === 'magic-link' ? 0 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Sparkles
                      className={`h-4 w-4 transition-all duration-300 ${
                        signupMethod === 'magic-link'
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
                    signupMethod === 'password'
                      ? 'text-white z-10 scale-[1.02] shadow-lg'
                      : 'text-muted-foreground hover:text-foreground hover:scale-[1.01] z-0'
                  }`}
                  onClick={() => setSignupMethod('password')}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      scale: signupMethod === 'password' ? 1 : 0.98,
                      y: signupMethod === 'password' ? 0 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Lock
                      className={`h-4 w-4 transition-all duration-300 ${
                        signupMethod === 'password'
                          ? 'text-white'
                          : 'text-blue-600'
                      }`}
                    />
                    Password
                  </motion.div>
                </button>
              </div>

              <AnimatePresence mode="wait">
                {signupMethod === 'magic-link' ? (
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
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="John Doe"
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
                                    onChange={(e) => {
                                      field.onChange(e);
                                      validateEmailDomain(e.target.value);
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <AnimatePresence>
                          {showEmailDomainWarning && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              className="bg-amber-50 border border-amber-200 rounded-lg p-3"
                            >
                              <p className="text-sm text-amber-800 flex items-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-4 w-4 mr-2 text-amber-600 flex-shrink-0"
                                >
                                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                  <path d="M12 9v4" />
                                  <path d="m12 17 .01 0" />
                                </svg>
                                Only allowed email domains can register:
                                @visanet.app, @visanet.co, @visanet.co.il,
                                @visanet.ru, @visanet.se
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="magic-link-notification border border-emerald-200 dark:border-emerald-800/30 rounded-lg p-3">
                          <p className="text-sm text-foreground flex items-center">
                            <Sparkles className="h-5 w-5 mr-2 text-emerald-600" />
                            We'll send you a magic link to create your account
                            instantly
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
                              Create account with Magic Link
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
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="John Doe"
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
                                    onChange={(e) => {
                                      field.onChange(e);
                                      validateEmailDomain(e.target.value);
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <AnimatePresence>
                          {showEmailDomainWarning && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              className="bg-amber-50 border border-amber-200 rounded-lg p-3"
                            >
                              <p className="text-sm text-amber-800 flex items-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-4 w-4 mr-2 text-amber-600 flex-shrink-0"
                                >
                                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                  <path d="M12 9v4" />
                                  <path d="m12 17 .01 0" />
                                </svg>
                                Only allowed email domains can register:
                                @visanet.app, @visanet.co, @visanet.co.il,
                                @visanet.ru, @visanet.se
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <FormField
                          control={passwordForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
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
                                    passwordForm.trigger('password');
                                  }}
                                  {...field}
                                />
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
                              Creating account...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Create account
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
                <div className="mx-auto w-16 h-16 bg-visanet-green/20 rounded-full flex items-center justify-center border border-visanet-green/30">
                  <Mail className="h-8 w-8 text-visanet-green" />
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
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="font-medium text-primary hover:underline"
              >
                Login
              </Link>
            </p>
          </CardFooter>
        )}
      </Card>

      <p className="text-center text-xs text-muted-foreground mt-6">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="font-medium hover:underline">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="font-medium hover:underline">
          Privacy Policy
        </Link>
      </p>
    </motion.div>
  );
}
