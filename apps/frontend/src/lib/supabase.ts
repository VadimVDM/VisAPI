import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: 'viewer' | 'operator' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role?: 'viewer' | 'operator' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'viewer' | 'operator' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          name: string;
          hashed_key: string;
          scopes: string[];
          expires_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          hashed_key: string;
          scopes?: string[];
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          hashed_key?: string;
          scopes?: string[];
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      workflows: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          schema: any;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          schema: any;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          schema?: any;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      logs: {
        Row: {
          id: number;
          level: string;
          message: string;
          metadata: any;
          workflow_id: string | null;
          job_id: string | null;
          pii_redacted: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          level: string;
          message: string;
          metadata?: any;
          workflow_id?: string | null;
          job_id?: string | null;
          pii_redacted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          level?: string;
          message?: string;
          metadata?: any;
          workflow_id?: string | null;
          job_id?: string | null;
          pii_redacted?: boolean;
          created_at?: string;
        };
      };
    };
  };
};
