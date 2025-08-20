export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          hashed_secret: string | null
          id: string
          last_used_at: string | null
          name: string
          prefix: string | null
          scopes: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          hashed_secret?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          prefix?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          hashed_secret?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          prefix?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          created_at: string
          id: number
          job_id: string | null
          level: string
          message: string
          metadata: Json | null
          pii_redacted: boolean | null
          workflow_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          job_id?: string | null
          level: string
          message: string
          metadata?: Json | null
          pii_redacted?: boolean | null
          workflow_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          job_id?: string | null
          level?: string
          message?: string
          metadata?: Json | null
          pii_redacted?: boolean | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_data: Json | null
          amount: number
          applicants_data: Json | null
          branch: string
          business_data: Json | null
          cgb_contact_exists: boolean | null
          cgb_contact_id: string | null
          cgb_has_whatsapp: boolean | null
          cgb_sync_attempted_at: string | null
          cgb_sync_completed_at: string | null
          cgb_sync_error: string | null
          cgb_sync_status: string | null
          client_email: string
          client_name: string
          client_phone: string
          coupon_data: Json | null
          created_at: string | null
          currency: string
          domain: string
          emergency_contact_data: Json | null
          entry_date: string | null
          entry_port: string | null
          entry_type: string | null
          extra_data: Json | null
          extra_nationality_data: Json | null
          face_url: string | null
          family_data: Json | null
          file_transfer_method: string | null
          files_data: Json | null
          form_id: string
          form_meta_data: Json | null
          id: string
          job_id: string | null
          military_data: Json | null
          occupation_data: Json | null
          order_id: string
          order_status: string
          passport_data: Json | null
          passport_url: string | null
          past_travels_data: Json | null
          payment_id: string
          payment_processor: string
          processed_at: string | null
          product_country: string
          product_doc_name: string | null
          product_doc_type: string | null
          product_name: string
          updated_at: string | null
          urgency: string | null
          visa_quantity: number | null
          webhook_received_at: string
          whatsapp_alerts_enabled: boolean | null
          workflow_id: string | null
        }
        Insert: {
          address_data?: Json | null
          amount: number
          applicants_data?: Json | null
          branch: string
          business_data?: Json | null
          cgb_contact_exists?: boolean | null
          cgb_contact_id?: string | null
          cgb_has_whatsapp?: boolean | null
          cgb_sync_attempted_at?: string | null
          cgb_sync_completed_at?: string | null
          cgb_sync_error?: string | null
          cgb_sync_status?: string | null
          client_email: string
          client_name: string
          client_phone: string
          coupon_data?: Json | null
          created_at?: string | null
          currency: string
          domain: string
          emergency_contact_data?: Json | null
          entry_date?: string | null
          entry_port?: string | null
          entry_type?: string | null
          extra_data?: Json | null
          extra_nationality_data?: Json | null
          face_url?: string | null
          family_data?: Json | null
          file_transfer_method?: string | null
          files_data?: Json | null
          form_id: string
          form_meta_data?: Json | null
          id?: string
          job_id?: string | null
          military_data?: Json | null
          occupation_data?: Json | null
          order_id: string
          order_status: string
          passport_data?: Json | null
          passport_url?: string | null
          past_travels_data?: Json | null
          payment_id: string
          payment_processor: string
          processed_at?: string | null
          product_country: string
          product_doc_name?: string | null
          product_doc_type?: string | null
          product_name: string
          updated_at?: string | null
          urgency?: string | null
          visa_quantity?: number | null
          webhook_received_at: string
          whatsapp_alerts_enabled?: boolean | null
          workflow_id?: string | null
        }
        Update: {
          address_data?: Json | null
          amount?: number
          applicants_data?: Json | null
          branch?: string
          business_data?: Json | null
          cgb_contact_exists?: boolean | null
          cgb_contact_id?: string | null
          cgb_has_whatsapp?: boolean | null
          cgb_sync_attempted_at?: string | null
          cgb_sync_completed_at?: string | null
          cgb_sync_error?: string | null
          cgb_sync_status?: string | null
          client_email?: string
          client_name?: string
          client_phone?: string
          coupon_data?: Json | null
          created_at?: string | null
          currency?: string
          domain?: string
          emergency_contact_data?: Json | null
          entry_date?: string | null
          entry_port?: string | null
          entry_type?: string | null
          extra_data?: Json | null
          extra_nationality_data?: Json | null
          face_url?: string | null
          family_data?: Json | null
          file_transfer_method?: string | null
          files_data?: Json | null
          form_id?: string
          form_meta_data?: Json | null
          id?: string
          job_id?: string | null
          military_data?: Json | null
          occupation_data?: Json | null
          order_id?: string
          order_status?: string
          passport_data?: Json | null
          passport_url?: string | null
          past_travels_data?: Json | null
          payment_id?: string
          payment_processor?: string
          processed_at?: string | null
          product_country?: string
          product_doc_name?: string | null
          product_doc_type?: string | null
          product_name?: string
          updated_at?: string | null
          urgency?: string | null
          visa_quantity?: number | null
          webhook_received_at?: string
          whatsapp_alerts_enabled?: boolean | null
          workflow_id?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          theme_preference: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          theme_preference?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          theme_preference?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      webhook_data: {
        Row: {
          created_at: string | null
          data: Json
          processed: boolean | null
          processed_at: string | null
          type: string
          webhook_id: string
        }
        Insert: {
          created_at?: string | null
          data: Json
          processed?: boolean | null
          processed_at?: string | null
          type: string
          webhook_id?: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          processed?: boolean | null
          processed_at?: string | null
          type?: string
          webhook_id?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          schema: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          schema: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          schema?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      backfill_orders_from_logs: {
        Args: Record<PropertyKey, never>
        Returns: {
          error_count: number
          inserted_count: number
          skipped_count: number
        }[]
      }
      check_user_permission: {
        Args: { p_action: string; p_resource: string; p_user_id: string }
        Returns: boolean
      }
      get_user_roles: {
        Args: { p_user_id: string }
        Returns: {
          display_name: string
          permissions: Json
          role_name: string
        }[]
      }
    }
    Enums: {
      user_role: "viewer" | "operator" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["viewer", "operator", "admin"],
    },
  },
} as const