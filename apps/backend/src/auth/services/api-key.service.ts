import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { ConfigService } from '@visapi/core-config';
import { ApiKeyRecord } from '@visapi/shared-types';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

/**
 * Service for managing API keys
 * Handles creation, validation, listing, and revocation of API keys
 */
@Injectable()
export class ApiKeyService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Creates a new API key with specified scopes
   */
  async createApiKey(
    name: string,
    scopes: string[],
    createdBy: string,
    customPrefix?: string,
  ): Promise<{ key: string; apiKey: ApiKeyRecord }> {
    // Generate prefix and secret
    const prefix = customPrefix || this.config.apiKeyPrefix || 'visapi_';
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

  /**
   * Validates an API key and returns the record if valid
   */
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
    await this.updateLastUsed(data.id);

    return data;
  }

  /**
   * Lists all API keys, optionally filtered by user
   */
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

  /**
   * Revokes an API key by ID
   */
  async revokeApiKey(keyId: string): Promise<void> {
    const { error } = await this.supabase.serviceClient
      .from('api_keys')
      .delete()
      .eq('id', keyId);

    if (error) {
      throw new Error(`Failed to revoke API key: ${error.message}`);
    }
  }

  /**
   * Checks if an API key has the required scopes
   */
  checkScopes(apiKey: ApiKeyRecord, requiredScopes: string[]): boolean {
    if (!requiredScopes.length) {
      return true;
    }

    return requiredScopes.every((scope) => apiKey.scopes.includes(scope));
  }

  /**
   * Splits an API key into prefix and secret components
   */
  private splitApiKey(apiKey: string): { prefix: string; secret: string } {
    // Split by the last dot to handle prefixes like "n8n_xxxx.secret"
    const lastDotIndex = apiKey.lastIndexOf('.');

    if (lastDotIndex === -1) {
      return { prefix: '', secret: '' };
    }

    const prefix = apiKey.substring(0, lastDotIndex);
    const secret = apiKey.substring(lastDotIndex + 1);

    return { prefix, secret };
  }

  /**
   * Updates the last_used_at timestamp for an API key
   */
  private async updateLastUsed(keyId: string): Promise<void> {
    await this.supabase.serviceClient
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId);
  }
}