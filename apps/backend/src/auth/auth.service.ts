import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { ConfigService } from '@visapi/core-config';
import {
  ApiKeyRecord,
  User,
  RoleRecord,
  UserRoleRecord,
  InsertUser,
  InsertUserRole,
} from '@visapi/shared-types';
import {
  validatePassword,
  DEFAULT_PASSWORD_REQUIREMENTS,
} from '@visapi/shared-utils';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AuthUser, Session } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  async createApiKey(
    name: string,
    scopes: string[],
    createdBy: string,
  ): Promise<{ key: string; apiKey: ApiKeyRecord }> {
    // Generate prefix and secret
    const prefix = this.config.apiKeyPrefix ?? 'vapi_';
    const secret = randomBytes(32).toString('hex');
    const fullKey = `${prefix}${secret}`;

    // Hash only the secret part for storage
    const hashedSecret = await bcrypt.hash(secret, 12);

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + (this.config.apiKeyExpiryDays ?? 90),
    );

    // Store in database
    const { data, error } = await this.supabase.serviceClient
      .from('api_keys')
      .insert({
        name,
        prefix,
        hashed_key: hashedSecret, // This was missing
        hashed_secret: hashedSecret,
        scopes,
        expires_at: expiresAt.toISOString(),
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    return {
      key: fullKey,
      apiKey: data as ApiKeyRecord,
    };
  }

  async validateApiKey(apiKey: string): Promise<ApiKeyRecord | null> {
    const { prefix, secret } = this.splitApiKey(apiKey);
    if (!prefix || !secret) {
      return null;
    }

    // Find the API key record by prefix
    const { data, error } = await this.supabase.serviceClient
      .from('api_keys')
      .select('*')
      .eq('prefix', prefix)
      .single<ApiKeyRecord>();

    if (error || !data) {
      return null;
    }

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    // Use bcrypt.compare to validate the secret
    const isValid = await bcrypt.compare(secret, data.hashed_secret);
    if (!isValid) {
      return null;
    }

    // Update last_used_at timestamp
    await this.supabase.serviceClient
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    return data;
  }

  async listApiKeys(userId?: string): Promise<ApiKeyRecord[]> {
    let query = this.supabase.serviceClient
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('created_by', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list API keys: ${error.message}`);
    }

    return (data as ApiKeyRecord[]) || [];
  }

  async revokeApiKey(keyId: string): Promise<void> {
    const { error } = await this.supabase.serviceClient
      .from('api_keys')
      .delete()
      .eq('id', keyId);

    if (error) {
      throw new Error(`Failed to revoke API key: ${error.message}`);
    }
  }

  private splitApiKey(apiKey: string): { prefix: string; secret: string } {
    const prefixPattern = this.config.apiKeyPrefix ?? 'vapi_';

    if (!apiKey.startsWith(prefixPattern)) {
      return { prefix: '', secret: '' };
    }

    const prefix = prefixPattern;
    const secret = apiKey.slice(prefix.length);

    return { prefix, secret };
  }

  checkScopes(apiKey: ApiKeyRecord, requiredScopes: string[]): boolean {
    if (!requiredScopes.length) {
      return true;
    }

    return requiredScopes.every((scope) => apiKey.scopes.includes(scope));
  }

  // Supabase Auth Methods

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

  async verifyJWT(
    token: string,
  ): Promise<{ user: AuthUser | null; error: Error | null }> {
    const { data, error } = await this.supabase.client.auth.getUser(token);

    if (error) {
      return { user: null, error: error as Error | null };
    }

    return { user: data.user, error: null };
  }

  async signOut(): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.auth.signOut();

    if (error) {
      throw new BadRequestException(`Sign out failed: ${error.message}`);
    }

    return { error: error as Error | null };
  }

  // User Management Methods

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

  async getUserWithRoles(
    userId: string,
  ): Promise<(User & { roles: RoleRecord[] }) | null> {
    const { data, error } = await this.supabase.serviceClient
      .from('users')
      .select(
        `
        *,
        user_roles!inner(
          roles(*)
        )
      `,
      )
      .eq('id', userId)
      .single<{ user_roles: { roles: RoleRecord }[] } & User>();

    if (error) {
      return null;
    }

    // Transform the nested structure
    const roles = data.user_roles.map((ur) => ur.roles);
    const userWithRoles = { ...data, roles };

    return userWithRoles;
  }

  async assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
  ): Promise<UserRoleRecord> {
    const userRoleData: InsertUserRole = {
      user_id: userId,
      role_id: roleId,
      assigned_by: assignedBy,
    };

    const { data, error } = await this.supabase.serviceClient
      .from('user_roles')
      .insert(userRoleData)
      .select()
      .single<UserRoleRecord>();

    if (error) {
      throw new Error(`Failed to assign role: ${error.message}`);
    }

    return data;
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    const { error } = await this.supabase.serviceClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId);

    if (error) {
      throw new Error(`Failed to remove role: ${error.message}`);
    }
  }

  async checkPermission(userId: string, permission: string): Promise<boolean> {
    const userWithRoles = await this.getUserWithRoles(userId);
    if (!userWithRoles) {
      return false;
    }

    return userWithRoles.roles.some(
      (role) => role.permissions[permission] === true,
    );
  }

  // Helper Methods

  private isValidEmailDomain(email: string): boolean {
    const allowedDomains = this.config.allowedEmailDomains ?? ['visanet.com'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    return !!emailDomain && allowedDomains.includes(emailDomain);
  }

  private async assignDefaultRole(userId: string): Promise<void> {
    // Get the 'support' role as default
    const { data: role } = await this.supabase.serviceClient
      .from('roles')
      .select('id')
      .eq('name', 'support')
      .single<{ id: string }>();

    if (role) {
      await this.assignRole(userId, role.id, 'system');
    }
  }
}
