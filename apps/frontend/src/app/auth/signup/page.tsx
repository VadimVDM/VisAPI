'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@visapi/frontend-data';

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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const signupSchema = z.object({
  fullName: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  password: z.string()
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

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailDomainWarning, setShowEmailDomainWarning] = useState(false);
  
  // Allowed email domains (should match backend configuration)
  const allowedDomains = ['visanet.app', 'visanet.co', 'visanet.co.il', 'visanet.ru', 'visanet.se'];

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

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: SignupFormValues) {
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
      router.push('/auth/login?method=magic-link&email=' + encodeURIComponent(data.email));
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-visanet-blue/5 via-background to-visanet-green/5 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border border-visanet-blue/10 bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="flex justify-center mb-6">
              <img 
                src="/Visanet-Logo.svg" 
                alt="Visanet Logo" 
                className="h-12 w-auto"
              />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-visanet-blue to-visanet-green bg-clip-text text-transparent">Create an account</CardTitle>
            <CardDescription>
              Join Visanet to streamline your visa workflow automation
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pb-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2 text-amber-600 flex-shrink-0">
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                          <path d="M12 9v4"/>
                          <path d="m12 17 .01 0"/>
                        </svg>
                        Only allowed email domains can register: @visanet.app, @visanet.co, @visanet.co.il, @visanet.ru, @visanet.se
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <FormField
                  control={form.control}
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
                            form.trigger('password');
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
                  className="w-full bg-gradient-to-r from-visanet-blue to-visanet-blue/90 hover:from-visanet-blue/90 hover:to-visanet-blue/80 text-white font-semibold shadow-lg shadow-visanet-blue/25 border border-visanet-blue/20"
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

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-visanet-green/30 text-visanet-green hover:bg-visanet-green/10 hover:border-visanet-green/50 font-semibold shadow-md shadow-visanet-green/10"
              size="lg"
              disabled={isLoading}
              onClick={() => router.push('/auth/login?method=magic-link')}
            >
              <Mail className="mr-2 h-4 w-4" />
              Sign up with Magic Link
            </Button>
          </CardContent>

          <CardFooter>
            <p className="text-center text-sm text-muted-foreground w-full">
              Already have an account?{' '}
              <Link 
                href="/auth/login" 
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
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
    </div>
  );
}