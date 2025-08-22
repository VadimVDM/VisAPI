import { Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  select?: string;
}

export interface FindOneOptions {
  select?: string;
}

export interface FindManyOptions extends QueryOptions {
  where?: Record<string, any>;
}

export abstract class BaseRepository<T> {
  protected abstract readonly tableName: string;
  protected abstract readonly logger: Logger;

  constructor(protected readonly supabase: SupabaseClient) {}

  /**
   * Find a single record by ID
   */
  async findById(id: string, options?: FindOneOptions): Promise<T | null> {
    const query = this.supabase
      .from(this.tableName)
      .select(options?.select || '*')
      .eq('id', id)
      .single();

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Record not found
      }
      this.logger.error(`Error finding ${this.tableName} by id`, error);
      throw error;
    }

    return data as T;
  }

  /**
   * Find many records with optional filtering
   */
  async findMany(options?: FindManyOptions): Promise<T[]> {
    let query = this.supabase
      .from(this.tableName)
      .select(options?.select || '*');

    // Apply where conditions
    if (options?.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        if (value !== undefined) {
          // Handle date range operators
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            if (value.$gte !== undefined) {
              query = query.gte(key, value.$gte);
            }
            if (value.$lte !== undefined) {
              query = query.lte(key, value.$lte);
            }
            if (value.$gt !== undefined) {
              query = query.gt(key, value.$gt);
            }
            if (value.$lt !== undefined) {
              query = query.lt(key, value.$lt);
            }
          } else {
            query = query.eq(key, value);
          }
        }
      });
    }

    // Apply ordering
    if (options?.orderBy) {
      query = query.order(options.orderBy, {
        ascending: options.orderDirection === 'asc',
      });
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1,
      );
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Error finding ${this.tableName} records`, error);
      throw error;
    }

    return (data || []) as T[];
  }

  /**
   * Find a single record matching criteria
   */
  async findOne(where: Record<string, any>, options?: FindOneOptions): Promise<T | null> {
    let query = this.supabase
      .from(this.tableName)
      .select(options?.select || '*');

    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Record not found
      }
      this.logger.error(`Error finding ${this.tableName} record`, error);
      throw error;
    }

    return data as T;
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    const { data: created, error } = await this.supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating ${this.tableName} record`, error);
      throw error;
    }

    return created as T;
  }

  /**
   * Create multiple records
   */
  async createMany(data: Partial<T>[]): Promise<T[]> {
    const { data: created, error } = await this.supabase
      .from(this.tableName)
      .insert(data)
      .select();

    if (error) {
      this.logger.error(`Error creating ${this.tableName} records`, error);
      throw error;
    }

    return (created || []) as T[];
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    const { data: updated, error } = await this.supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating ${this.tableName} record`, error);
      throw error;
    }

    return updated as T;
  }

  /**
   * Update multiple records matching criteria
   */
  async updateMany(
    where: Record<string, any>,
    data: Partial<T>,
  ): Promise<T[]> {
    let query = this.supabase.from(this.tableName).update(data);

    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    });

    const { data: updated, error } = await query.select();

    if (error) {
      this.logger.error(`Error updating ${this.tableName} records`, error);
      throw error;
    }

    return (updated || []) as T[];
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Error deleting ${this.tableName} record`, error);
      throw error;
    }

    return true;
  }

  /**
   * Delete multiple records matching criteria
   */
  async deleteMany(where: Record<string, any>): Promise<number> {
    let query = this.supabase.from(this.tableName).delete();

    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query.select();

    if (error) {
      this.logger.error(`Error deleting ${this.tableName} records`, error);
      throw error;
    }

    return data?.length || 0;
  }

  /**
   * Count records matching criteria
   */
  async count(where?: Record<string, any>): Promise<number> {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (where) {
      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          // Handle date range operators
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            if (value.$gte !== undefined) {
              query = query.gte(key, value.$gte);
            }
            if (value.$lte !== undefined) {
              query = query.lte(key, value.$lte);
            }
            if (value.$gt !== undefined) {
              query = query.gt(key, value.$gt);
            }
            if (value.$lt !== undefined) {
              query = query.lt(key, value.$lt);
            }
          } else {
            query = query.eq(key, value);
          }
        }
      });
    }

    const { count, error } = await query;

    if (error) {
      this.logger.error(`Error counting ${this.tableName} records`, error);
      throw error;
    }

    return count || 0;
  }

  /**
   * Check if a record exists
   */
  async exists(where: Record<string, any>): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Execute a raw query (for complex operations)
   */
  protected async rawQuery<R = any>(
    query: string,
    params?: any[],
  ): Promise<R[]> {
    const { data, error } = await this.supabase.rpc('exec_sql', {
      query,
      params,
    });

    if (error) {
      this.logger.error('Error executing raw query', error);
      throw error;
    }

    return data as R[];
  }
}