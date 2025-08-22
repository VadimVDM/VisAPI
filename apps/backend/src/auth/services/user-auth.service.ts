import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { ConfigService } from '@visapi/core-config';
import { User, InsertUser } from '@visapi/shared-types';
import {
  validatePassword,
  DEFAULT_PASSWORD_REQUIREMENTS,
} from '@visapi/shared-utils';
import { AuthUser, Session } from '@supabase/supabase-js';

/**
 * Service for handling user authentication operations
 * Manages sign up, sign in, password reset, and magic link authentication
 */
@Injectable()
export class UserAuthService {
  private readonly logger = new Logger(UserAuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Signs up a new user with email and password
   */
  async signUpWithEmail(
    email: string,
    password: string,
  ): Promise<{ user: AuthUser | null; error: Error | null }> {
    // Validate email domain
    if (!this.isValidEmailDomain(email)) {
      throw new BadRequestException(
        'Email domain not allowed. Only @visanet.com emails are permitted.',
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(
      password,
      DEFAULT_PASSWORD_REQUIREMENTS,
    );
    if (!passwordValidation.isValid) {
      throw new BadRequestException(
        `Password does not meet requirements: ${passwordValidation.feedback.join(', ')}`,
      );
    }

    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new BadRequestException(`Registration failed: ${error.message}`);
    }

    // If signup was successful and user is confirmed, create user record
    if (data.user && data.user.email_confirmed_at) {
      await this.createUserRecord(data.user);
    }

    return { user: data.user, error: error as Error | null };
  }

  /**
   * Signs in a user with email and password
   */
  async signInWithEmail(
    email: string,
    password: string,
  ): Promise<{
    user: AuthUser | null;
    session: Session | null;
    error: Error | null;
  }> {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new UnauthorizedException(`Login failed: ${error.message}`);
    }

    return {
      user: data.user,
      session: data.session,
      error: error as Error | null,
    };
  }

  /**
   * Sends a magic link to the user's email
   */
  async signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
    // Validate email domain
    if (!this.isValidEmailDomain(email)) {
      throw new BadRequestException(
        'Email domain not allowed. Only @visanet.com emails are permitted.',
      );
    }

    const { error } = await this.supabase.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${this.config.frontendUrl}/auth/callback`,
      },
    });

    if (error) {
      throw new BadRequestException(`Magic link failed: ${error.message}`);
    }

    return { error: error as Error | null };
  }

  /**
   * Sends a password reset email
   */
  async resetPassword(email: string): Promise<{ error: Error | null }> {
    // Validate email domain
    if (!this.isValidEmailDomain(email)) {
      throw new BadRequestException(
        'Email domain not allowed. Only @visanet.com emails are permitted.',
      );
    }

    const { error } = await this.supabase.client.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${this.config.frontendUrl}/auth/reset-password`,
      },
    );

    if (error) {
      throw new BadRequestException(`Password reset failed: ${error.message}`);
    }

    return { error: error as Error | null };
  }

  /**
   * Updates the user's password
   */
  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    // Validate password strength
    const passwordValidation = validatePassword(
      newPassword,
      DEFAULT_PASSWORD_REQUIREMENTS,
    );
    if (!passwordValidation.isValid) {
      throw new BadRequestException(
        `Password does not meet requirements: ${passwordValidation.feedback.join(', ')}`,
      );
    }

    const { error } = await this.supabase.client.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new BadRequestException(`Password update failed: ${error.message}`);
    }

    return { error: error as Error | null };
  }

  /**
   * Signs out the current user
   */
  async signOut(): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.auth.signOut();

    if (error) {
      throw new BadRequestException(`Sign out failed: ${error.message}`);
    }

    return { error: error as Error | null };
  }

  /**
   * Creates a user record in the database
   */
  async createUserRecord(authUser: AuthUser): Promise<User> {
    const userData: InsertUser = {
      email: authUser.email,
      auth_user_id: authUser.id,
      role: 'viewer', // Default role
    };

    const { data, error } = await this.supabase.serviceClient
      .from('users')
      .insert(userData)
      .select()
      .single<User>();

    if (error) {
      throw new Error(`Failed to create user record: ${error.message}`);
    }

    // Assign default role
    await this.assignDefaultRole(data.id);

    return data;
  }

  /**
   * Gets a user by their auth user ID
   */
  async getUserByAuthId(authUserId: string): Promise<User | null> {
    const { data, error } = await this.supabase.serviceClient
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single<User>();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Validates if an email domain is allowed
   */
  private isValidEmailDomain(email: string): boolean {
    const allowedDomains = this.config.allowedEmailDomains ?? ['visanet.com'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    return !!emailDomain && allowedDomains.includes(emailDomain);
  }

  /**
   * Assigns the default role to a new user
   */
  private async assignDefaultRole(userId: string): Promise<void> {
    // Get the 'support' role as default
    const { data: role } = await this.supabase.serviceClient
      .from('roles')
      .select('id')
      .eq('name', 'support')
      .single<{ id: string }>();

    if (role) {
      const { error } = await this.supabase.serviceClient
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: role.id,
          assigned_by: 'system',
        });

      if (error) {
        this.logger.error('Failed to assign default role:', error);
      }
    }
  }
}