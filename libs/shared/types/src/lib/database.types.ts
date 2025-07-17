// Database types shared between frontend and backend
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: 'viewer' | 'operator' | 'admin';
          auth_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role?: 'viewer' | 'operator' | 'admin';
          auth_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'viewer' | 'operator' | 'admin';
          auth_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          name: string;
          hashed_key: string; // Legacy field, will be deprecated
          prefix: string | null;
          hashed_secret: string | null;
          scopes: string[];
          expires_at: string | null;
          created_by: string | null;
          created_at: string;
          last_used_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          hashed_key?: string; // Legacy field, will be deprecated
          prefix?: string | null;
          hashed_secret?: string | null;
          scopes?: string[];
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          last_used_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          hashed_key?: string; // Legacy field, will be deprecated
          prefix?: string | null;
          hashed_secret?: string | null;
          scopes?: string[];
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          last_used_at?: string | null;
          updated_at?: string;
        };
      };
      workflows: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          schema: any;
          enabled: boolean; // Non-nullable with default true
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          schema: any;
          enabled?: boolean; // Defaults to true
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
      roles: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          permissions: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          permissions?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          description?: string | null;
          permissions?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          user_id: string;
          role_id: string;
          assigned_by: string | null;
          assigned_at: string;
        };
        Insert: {
          user_id: string;
          role_id: string;
          assigned_by?: string | null;
          assigned_at?: string;
        };
        Update: {
          user_id?: string;
          role_id?: string;
          assigned_by?: string | null;
          assigned_at?: string;
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

export type RoleRecord = Database['public']['Tables']['roles']['Row'];
export type UserRoleRecord = Database['public']['Tables']['user_roles']['Row'];

export type InsertUser = Database['public']['Tables']['users']['Insert'];
export type InsertApiKey = Database['public']['Tables']['api_keys']['Insert'];
export type InsertWorkflow =
  Database['public']['Tables']['workflows']['Insert'];
export type InsertLog = Database['public']['Tables']['logs']['Insert'];
export type InsertRole = Database['public']['Tables']['roles']['Insert'];
export type InsertUserRole = Database['public']['Tables']['user_roles']['Insert'];

export type UpdateUser = Database['public']['Tables']['users']['Update'];
export type UpdateApiKey = Database['public']['Tables']['api_keys']['Update'];
export type UpdateWorkflow =
  Database['public']['Tables']['workflows']['Update'];
export type UpdateLog = Database['public']['Tables']['logs']['Update'];
