import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { AuthUser } from '@supabase/supabase-js';

/**
 * Service for handling JWT and session token operations
 * Manages token verification and session validation
 */
@Injectable()
export class TokenService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Verifies a JWT token and returns the associated user
   */
  async verifyJWT(
    token: string,
  ): Promise<{ user: AuthUser | null; error: Error | null }> {
    const { data, error } = await this.supabase.client.auth.getUser(token);

    if (error) {
      return { user: null, error: error as Error | null };
    }

    return { user: data.user, error: null };
  }

  /**
   * Gets the current session from Supabase
   */
  async getSession() {
    const { data, error } = await this.supabase.client.auth.getSession();

    if (error) {
      return { session: null, error: error as Error | null };
    }

    return { session: data.session, error: null };
  }

  /**
   * Refreshes the current session
   */
  async refreshSession() {
    const { data, error } = await this.supabase.client.auth.refreshSession();

    if (error) {
      return { session: null, user: null, error: error as Error | null };
    }

    return {
      session: data.session,
      user: data.user,
      error: null,
    };
  }

  /**
   * Sets a new session
   */
  async setSession(accessToken: string, refreshToken: string) {
    const { data, error } = await this.supabase.client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      return { session: null, user: null, error: error as Error | null };
    }

    return {
      session: data.session,
      user: data.user,
      error: null,
    };
  }

  /**
   * Gets the current user from the session
   */
  async getCurrentUser(): Promise<{
    user: AuthUser | null;
    error: Error | null;
  }> {
    const { data, error } = await this.supabase.client.auth.getUser();

    if (error) {
      return { user: null, error: error as Error | null };
    }

    return { user: data.user, error: null };
  }

  /**
   * Verifies an OTP token (for magic link or password reset)
   */
  async verifyOtp(
    email: string,
    token: string,
    type: 'magiclink' | 'recovery',
  ) {
    const { data, error } = await this.supabase.client.auth.verifyOtp({
      email,
      token,
      type,
    });

    if (error) {
      return { session: null, user: null, error: error as Error | null };
    }

    return {
      session: data.session,
      user: data.user,
      error: null,
    };
  }
}
