import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';
import { ConfigService } from '@visapi/core-config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  hashed_secret: string;
  scopes: string[];
  expires_at: string | null;
  created_by: string;
  created_at: string;
  active: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService
  ) {}

  async createApiKey(
    name: string,
    scopes: string[],
    createdBy: string
  ): Promise<{ key: string; apiKey: ApiKey }> {
    // Generate prefix and secret
    const prefix = this.config.apiKeyPrefix || 'vapi_';
    const secret = randomBytes(32).toString('hex');
    const fullKey = `${prefix}${secret}`;

    // Hash only the secret part for storage
    const hashedSecret = await bcrypt.hash(secret, 12);

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + (this.config.apiKeyExpiryDays || 90)
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
        active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    return {
      key: fullKey,
      apiKey: data,
    };
  }

  async validateApiKey(apiKey: string): Promise<ApiKey | null> {
    const { prefix, secret } = this.splitApiKey(apiKey);
    if (!prefix || !secret) {
      return null;
    }

    // Find the API key record by prefix
    const { data, error } = await this.supabase.serviceClient
      .from('api_keys')
      .select('*')
      .eq('prefix', prefix)
      .eq('active', true)
      .single();

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

    return data;
  }

  async listApiKeys(userId?: string): Promise<ApiKey[]> {
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

    return data || [];
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
    const prefixPattern = this.config.apiKeyPrefix || 'vapi_';

    if (!apiKey.startsWith(prefixPattern)) {
      return { prefix: '', secret: '' };
    }

    const prefix = prefixPattern;
    const secret = apiKey.slice(prefix.length);

    return { prefix, secret };
  }

  async checkScopes(
    apiKey: ApiKey,
    requiredScopes: string[]
  ): Promise<boolean> {
    if (!requiredScopes.length) {
      return true;
    }

    return requiredScopes.every((scope) => apiKey.scopes.includes(scope));
  }
}
