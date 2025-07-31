export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.3 (519615d)';
  };
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          hashed_key: string;
          hashed_secret: string | null;
          id: string;
          last_used_at: string | null;
          name: string;
          prefix: string | null;
          scopes: string[];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          hashed_key: string;
          hashed_secret?: string | null;
          id?: string;
          last_used_at?: string | null;
          name: string;
          prefix?: string | null;
          scopes?: string[];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          hashed_key?: string;
          hashed_secret?: string | null;
          id?: string;
          last_used_at?: string | null;
          name?: string;
          prefix?: string | null;
          scopes?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'api_keys_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      api_keys_backup: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          expires_at: string | null;
          hashed_key: string | null;
          id: string | null;
          name: string | null;
          scopes: string[] | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          expires_at?: string | null;
          hashed_key?: string | null;
          id?: string | null;
          name?: string | null;
          scopes?: string[] | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          expires_at?: string | null;
          hashed_key?: string | null;
          id?: string | null;
          name?: string | null;
          scopes?: string[] | null;
        };
        Relationships: [];
      };
      applicants: {
        Row: {
          address_city: string | null;
          address_country: string | null;
          address_line: string | null;
          address_set_by: number | null;
          applicant_id: string;
          city_of_birth: string | null;
          created_at: string;
          crime: string | null;
          extra_nationality_status: string | null;
          family_data: Json | null;
          files: Json | null;
          guardian_passport: string | null;
          id: string;
          id_number: string | null;
          last_travel: Json | null;
          marital_status: string | null;
          military: Json | null;
          occupation_address: Json | null;
          occupation_education: string | null;
          occupation_name: string | null;
          occupation_phone: Json | null;
          occupation_seniority: string | null;
          occupation_status: string | null;
          order_id: string;
          passport_country_of_birth: string | null;
          passport_date_of_birth: string | null;
          passport_date_of_expiry: string | null;
          passport_date_of_issue: string | null;
          passport_first_name: string | null;
          passport_last_name: string | null;
          passport_nationality: string | null;
          passport_number: string | null;
          passport_place_of_issue: string | null;
          passport_sex: string | null;
          past_travels: Json | null;
          past_visit_visited: boolean | null;
          past_visit_year: string | null;
          religion: string | null;
          updated_at: string;
          visited: boolean | null;
        };
        Insert: {
          address_city?: string | null;
          address_country?: string | null;
          address_line?: string | null;
          address_set_by?: number | null;
          applicant_id: string;
          city_of_birth?: string | null;
          created_at?: string;
          crime?: string | null;
          extra_nationality_status?: string | null;
          family_data?: Json | null;
          files?: Json | null;
          guardian_passport?: string | null;
          id?: string;
          id_number?: string | null;
          last_travel?: Json | null;
          marital_status?: string | null;
          military?: Json | null;
          occupation_address?: Json | null;
          occupation_education?: string | null;
          occupation_name?: string | null;
          occupation_phone?: Json | null;
          occupation_seniority?: string | null;
          occupation_status?: string | null;
          order_id: string;
          passport_country_of_birth?: string | null;
          passport_date_of_birth?: string | null;
          passport_date_of_expiry?: string | null;
          passport_date_of_issue?: string | null;
          passport_first_name?: string | null;
          passport_last_name?: string | null;
          passport_nationality?: string | null;
          passport_number?: string | null;
          passport_place_of_issue?: string | null;
          passport_sex?: string | null;
          past_travels?: Json | null;
          past_visit_visited?: boolean | null;
          past_visit_year?: string | null;
          religion?: string | null;
          updated_at?: string;
          visited?: boolean | null;
        };
        Update: {
          address_city?: string | null;
          address_country?: string | null;
          address_line?: string | null;
          address_set_by?: number | null;
          applicant_id?: string;
          city_of_birth?: string | null;
          created_at?: string;
          crime?: string | null;
          extra_nationality_status?: string | null;
          family_data?: Json | null;
          files?: Json | null;
          guardian_passport?: string | null;
          id?: string;
          id_number?: string | null;
          last_travel?: Json | null;
          marital_status?: string | null;
          military?: Json | null;
          occupation_address?: Json | null;
          occupation_education?: string | null;
          occupation_name?: string | null;
          occupation_phone?: Json | null;
          occupation_seniority?: string | null;
          occupation_status?: string | null;
          order_id?: string;
          passport_country_of_birth?: string | null;
          passport_date_of_birth?: string | null;
          passport_date_of_expiry?: string | null;
          passport_date_of_issue?: string | null;
          passport_first_name?: string | null;
          passport_last_name?: string | null;
          passport_nationality?: string | null;
          passport_number?: string | null;
          passport_place_of_issue?: string | null;
          passport_sex?: string | null;
          past_travels?: Json | null;
          past_visit_visited?: boolean | null;
          past_visit_year?: string | null;
          religion?: string | null;
          updated_at?: string;
          visited?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'applicants_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      business_info: {
        Row: {
          address_city: string | null;
          address_country: string | null;
          address_line: string | null;
          created_at: string;
          id: string;
          name: string | null;
          order_id: string;
          phone: Json | null;
          sector: string | null;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          address_city?: string | null;
          address_country?: string | null;
          address_line?: string | null;
          created_at?: string;
          id?: string;
          name?: string | null;
          order_id: string;
          phone?: Json | null;
          sector?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          address_city?: string | null;
          address_country?: string | null;
          address_line?: string | null;
          created_at?: string;
          id?: string;
          name?: string | null;
          order_id?: string;
          phone?: Json | null;
          sector?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'business_info_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      form_metadata: {
        Row: {
          children: Json | null;
          client: Json | null;
          country: string | null;
          created_at: string;
          entry_date: string | null;
          entry_port: string | null;
          form_id: string;
          id: string;
          meta: Json | null;
          order_id: string;
          product: Json | null;
          quantity: number | null;
          stay_address: string | null;
          updated_at: string;
          urgency: string | null;
        };
        Insert: {
          children?: Json | null;
          client?: Json | null;
          country?: string | null;
          created_at?: string;
          entry_date?: string | null;
          entry_port?: string | null;
          form_id: string;
          id?: string;
          meta?: Json | null;
          order_id: string;
          product?: Json | null;
          quantity?: number | null;
          stay_address?: string | null;
          updated_at?: string;
          urgency?: string | null;
        };
        Update: {
          children?: Json | null;
          client?: Json | null;
          country?: string | null;
          created_at?: string;
          entry_date?: string | null;
          entry_port?: string | null;
          form_id?: string;
          id?: string;
          meta?: Json | null;
          order_id?: string;
          product?: Json | null;
          quantity?: number | null;
          stay_address?: string | null;
          updated_at?: string;
          urgency?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'form_metadata_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      logs: {
        Row: {
          created_at: string;
          id: number;
          job_id: string | null;
          level: string;
          message: string;
          metadata: Json | null;
          pii_redacted: boolean | null;
          workflow_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          job_id?: string | null;
          level: string;
          message: string;
          metadata?: Json | null;
          pii_redacted?: boolean | null;
          workflow_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          job_id?: string | null;
          level?: string;
          message?: string;
          metadata?: Json | null;
          pii_redacted?: boolean | null;
          workflow_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'logs_workflow_id_fkey';
            columns: ['workflow_id'];
            isOneToOne: false;
            referencedRelation: 'workflows';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          amount: number | null;
          branch: string | null;
          coupon: string | null;
          created_at: string;
          currency: string | null;
          domain: string | null;
          form_id: string;
          id: string;
          order_id: string;
          payment_id: string | null;
          payment_processor: string | null;
          raw_data: Json;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount?: number | null;
          branch?: string | null;
          coupon?: string | null;
          created_at?: string;
          currency?: string | null;
          domain?: string | null;
          form_id: string;
          id?: string;
          order_id: string;
          payment_id?: string | null;
          payment_processor?: string | null;
          raw_data: Json;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number | null;
          branch?: string | null;
          coupon?: string | null;
          created_at?: string;
          currency?: string | null;
          domain?: string | null;
          form_id?: string;
          id?: string;
          order_id?: string;
          payment_id?: string | null;
          payment_processor?: string | null;
          raw_data?: Json;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          created_at: string;
          description: string | null;
          display_name: string;
          id: string;
          name: string;
          permissions: Json;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_name: string;
          id?: string;
          name: string;
          permissions?: Json;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_name?: string;
          id?: string;
          name?: string;
          permissions?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          role_id: string;
          user_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          role_id: string;
          user_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          role_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_roles_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_roles_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_roles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          auth_user_id: string | null;
          created_at: string;
          email: string;
          id: string;
          role: Database['public']['Enums']['user_role'];
          theme_preference: string | null;
          updated_at: string;
        };
        Insert: {
          auth_user_id?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          role?: Database['public']['Enums']['user_role'];
          theme_preference?: string | null;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          role?: Database['public']['Enums']['user_role'];
          theme_preference?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      users_backup: {
        Row: {
          created_at: string | null;
          email: string | null;
          id: string | null;
          role: Database['public']['Enums']['user_role'] | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          id?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          id?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      webhook_logs: {
        Row: {
          body: Json | null;
          created_at: string;
          endpoint: string;
          error: string | null;
          headers: Json | null;
          id: string;
          method: string;
          processing_time_ms: number | null;
          response: Json | null;
          source: string;
          status_code: number | null;
        };
        Insert: {
          body?: Json | null;
          created_at?: string;
          endpoint: string;
          error?: string | null;
          headers?: Json | null;
          id?: string;
          method: string;
          processing_time_ms?: number | null;
          response?: Json | null;
          source: string;
          status_code?: number | null;
        };
        Update: {
          body?: Json | null;
          created_at?: string;
          endpoint?: string;
          error?: string | null;
          headers?: Json | null;
          id?: string;
          method?: string;
          processing_time_ms?: number | null;
          response?: Json | null;
          source?: string;
          status_code?: number | null;
        };
        Relationships: [];
      };
      workflows: {
        Row: {
          created_at: string;
          description: string | null;
          enabled: boolean;
          id: string;
          name: string;
          schema: Json;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          enabled?: boolean;
          id?: string;
          name: string;
          schema: Json;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          enabled?: boolean;
          id?: string;
          name?: string;
          schema?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_user_permission: {
        Args: { p_user_id: string; p_resource: string; p_action: string };
        Returns: boolean;
      };
      get_user_roles: {
        Args: { p_user_id: string };
        Returns: {
          role_name: string;
          display_name: string;
          permissions: Json;
        }[];
      };
    };
    Enums: {
      user_role: 'viewer' | 'operator' | 'admin';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      user_role: ['viewer', 'operator', 'admin'],
    },
  },
} as const;
