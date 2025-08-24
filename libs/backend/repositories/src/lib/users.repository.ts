import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { SupabaseService } from '@visapi/core-supabase';
import { User } from '@visapi/shared-types';

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  protected readonly tableName = 'users';
  protected readonly logger = new Logger(UsersRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {
    super(supabaseService.serviceClient);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email });
  }

  /**
   * Find users by role
   */
  async findByRole(roleId: string): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('user_id')
      .eq('role_id', roleId);

    if (error) {
      this.logger.error('Error finding users by role', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    const userIds = data.map((ur) => ur.user_id);
    return this.findMany({
      where: { id: { in: userIds } },
    });
  }

  /**
   * Find active users (logged in within last 30 days)
   */
  async findActiveUsers(days = 30): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .gte('last_sign_in_at', cutoffDate.toISOString())
      .order('last_sign_in_at', { ascending: false });

    if (error) {
      this.logger.error('Error finding active users', error);
      throw error;
    }

    return (data || []) as User[];
  }

  /**
   * Update last sign in
   */
  async updateLastSignIn(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      this.logger.error('Error updating last sign in', error);
      throw error;
    }
  }
}
