'use client';

import { useState } from 'react';
import { supabase } from '@visapi/frontend-data';
import { Mail, Loader2 } from 'lucide-react';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      // Check if email domain is allowed
      const allowedDomains =
        process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS?.split(',') || [
          'visanet.app',
        ];
      const emailDomain = email.split('@')[1];

      if (!allowedDomains.includes(emailDomain)) {
        setMessage(
          'Email domain not allowed. Please use a visanet.app email address.'
        );
        setIsError(true);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        setMessage(error.message);
        setIsError(true);
      } else {
        setMessage('Check your email for the login link!');
        setIsError(false);
      }
    } catch (error) {
      setMessage('An unexpected error occurred');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <Mail className="h-6 w-6 text-primary-600" aria-hidden="true" />
          </div>
          <h1 id="login-heading" className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            VisAPI Admin Dashboard
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in with your email to access the admin dashboard
          </p>
        </div>
        <form 
          className="mt-8 space-y-6" 
          onSubmit={handleLogin}
          role="form"
          aria-labelledby="login-heading"
        >
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              aria-describedby={message ? "login-message" : undefined}
              aria-invalid={isError}
              aria-required="true"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !email}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-describedby={loading ? "loading-status" : undefined}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span id="loading-status" className="sr-only">Sending magic link...</span>
                </>
              ) : (
                'Send Magic Link'
              )}
            </button>
          </div>

          {message && (
            <div
              id="login-message"
              className={`text-sm text-center ${
                message.includes('Check your email')
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
              role={isError ? "alert" : "status"}
              aria-live="polite"
              aria-atomic="true"
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
