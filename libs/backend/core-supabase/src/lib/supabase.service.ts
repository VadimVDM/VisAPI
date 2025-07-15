import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@visapi/core-config';
import { Database } from '@visapi/shared-types';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient<Database>;
  private serviceSupabase: SupabaseClient<Database>;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    // Client for public operations (using anon key)
    this.supabase = createClient<Database>(
      this.config.supabaseUrl,
      this.config.supabaseAnonKey
    );

    // Client for service operations (using service role key)
    this.serviceSupabase = createClient<Database>(
      this.config.supabaseUrl,
      this.config.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  get client(): SupabaseClient<Database> {
    return this.supabase;
  }

  get serviceClient(): SupabaseClient<Database> {
    return this.serviceSupabase;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const { error } = await this.serviceSupabase
        .from('users')
        .select('count')
        .limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}
