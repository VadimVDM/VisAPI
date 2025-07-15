// Database types shared between frontend and backend
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

// Type aliases for convenience
export type UserRole = 'viewer' | 'operator' | 'admin';

export type User = Database['public']['Tables']['users']['Row'];
export type ApiKeyRecord = Database['public']['Tables']['api_keys']['Row'];
export type WorkflowRecord = Database['public']['Tables']['workflows']['Row'];
export type LogRecord = Database['public']['Tables']['logs']['Row'];

export type InsertUser = Database['public']['Tables']['users']['Insert'];
export type InsertApiKey = Database['public']['Tables']['api_keys']['Insert'];
export type InsertWorkflow =
  Database['public']['Tables']['workflows']['Insert'];
export type InsertLog = Database['public']['Tables']['logs']['Insert'];

export type UpdateUser = Database['public']['Tables']['users']['Update'];
export type UpdateApiKey = Database['public']['Tables']['api_keys']['Update'];
export type UpdateWorkflow =
  Database['public']['Tables']['workflows']['Update'];
export type UpdateLog = Database['public']['Tables']['logs']['Update'];
