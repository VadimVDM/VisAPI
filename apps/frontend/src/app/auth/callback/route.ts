import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Handle auth callbacks from magic links
 * This route receives tokens from the backend auth confirm endpoint
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const type = searchParams.get('type');
  const error = searchParams.get('error');

  // Handle errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  // Validate tokens
  if (!accessToken || !refreshToken) {
    return NextResponse.redirect(
      new URL('/auth/login?error=Missing+authentication+tokens', request.url)
    );
  }

  try {
    // Create response that redirects to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', request.url));

    // Set auth cookies for the session
    // These cookies will be used by the Supabase client to maintain the session
    response.cookies.set('sb-access-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    response.cookies.set('sb-refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    // Log successful authentication
    console.log(`Auth callback successful: type=${type}`);

    return response;
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=Authentication+failed', request.url)
    );
  }
}