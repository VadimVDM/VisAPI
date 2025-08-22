import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { SupabaseService } from '@visapi/core-supabase';
import { ApiKeyRecord } from '@visapi/shared-types';
import { Cacheable, CacheEvict } from '@visapi/backend-cache';

export interface CreateApiKeyData {
  name: string;
  prefix: string;
  hashed_secret: string;
  scopes: string[];
  expires_at: string;
  created_by: string;
}

@Injectable()
export class ApiKeysRepository extends BaseRepository<ApiKeyRecord> {
  protected readonly tableName = 'api_keys';
  protected readonly logger = new Logger(ApiKeysRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {
    super(supabaseService.serviceClient);
  }

  /**
   * Find API key by prefix (cached for performance - called on every request)
   */
  @Cacheable({ ttl: 900, key: 'apikey:prefix' }) // 15 minutes
  async findByPrefix(prefix: string): Promise<ApiKeyRecord | null> {
    return this.findOne({ prefix });
  }

  /**
   * Find API keys by creator
   */
  async findByCreator(createdBy: string): Promise<ApiKeyRecord[]> {
    return this.findMany({
      where: { created_by: createdBy },
      orderBy: 'created_at',
      orderDirection: 'desc',
    });
  }

  /**
   * Find active API keys (not expired)
   */
  @Cacheable({ ttl: 300, key: 'apikey:active' }) // 5 minutes
  async findActiveKeys(): Promise<ApiKeyRecord[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Error finding active API keys', error);
      throw error;
    }

    return (data || []) as ApiKeyRecord[];
  }

  /**
   * Find expired API keys
   */
  async findExpiredKeys(): Promise<ApiKeyRecord[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .lt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true });

    if (error) {
      this.logger.error('Error finding expired API keys', error);
      throw error;
    }

    return (data || []) as ApiKeyRecord[];
  }

  /**
   * Update last used timestamp
   */
  @CacheEvict({ pattern: 'apikey:*' }) // Evict all API key caches
  async updateLastUsed(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      this.logger.error('Error updating last used timestamp', error);
      throw error;
    }
  }

  /**
   * Revoke an API key by setting expires_at to now
   */
  @CacheEvict({ pattern: 'apikey:*' }) // Evict all API key caches
  async revoke(id: string, revokedBy: string): Promise<ApiKeyRecord> {
    // Set expires_at to now to effectively revoke the key
    // Note: revokedBy is logged but not stored (no revoked_by column)
    this.logger.log(`API key ${id} revoked by ${revokedBy}`);
    return this.update(id, {
      expires_at: new Date().toISOString(),
    });
  }

  /**
   * Check if API key has specific scope
   */
  async hasScope(id: string, scope: string): Promise<boolean> {
    const key = await this.findById(id);
    if (!key) return false;
    return key.scopes.includes(scope);
  }

  /**
   * Get API key statistics
   */
  @Cacheable({ ttl: 60, key: 'apikey:stats' })
  async getStatistics(): Promise<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
  }> {
    const now = new Date().toISOString();

    const [total, expired, revoked] = await Promise.all([
      this.count(),
      this.count({ expires_at: { lt: now } }),
      this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .not('revoked_at', 'is', null)
        .then((r) => r.count || 0),
    ]);

    return {
      total,
      active: total - expired - revoked,
      expired,
      revoked,
    };
  }
}
// Force rebuild
