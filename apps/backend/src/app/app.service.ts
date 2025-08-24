import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@visapi/core-supabase';

@Injectable()
export class AppService {
  constructor(private readonly supabase: SupabaseService) {}

  getData(): { message: string } {
    // Updated to trigger deployment with email module
    return { message: 'Hello API' };
  }

  async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Simple query to check database connectivity
      const { error } = await this.supabase
        .serviceClient
        .from('api_keys')
        .select('id')
        .limit(1)
        .single();
      
      // If we get a 'PGRST116' error (no rows), that's fine - database is working
      if (error && error.code !== 'PGRST116') {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
}
