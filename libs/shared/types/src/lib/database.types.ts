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
      applicant_issues: {
        Row: {
          applicant_email: string | null
          applicant_id: string
          applicant_metadata: Json | null
          applicant_name: string | null
          applicant_phone: string | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          issues: Json
          metadata: Json | null
          order_id: string | null
          processed_at: string | null
          retry_count: number | null
          status: string
          updated_at: string | null
          whatsapp_contact_id: string | null
          whatsapp_correlation_id: string | null
          whatsapp_message_id: string | null
          whatsapp_notification_sent: boolean | null
          whatsapp_notification_sent_at: string | null
          whatsapp_template_used: string | null
        }
        Insert: {
          applicant_email?: string | null
          applicant_id: string
          applicant_metadata?: Json | null
          applicant_name?: string | null
          applicant_phone?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          issues: Json
          metadata?: Json | null
          order_id?: string | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string | null
          whatsapp_contact_id?: string | null
          whatsapp_correlation_id?: string | null
          whatsapp_message_id?: string | null
          whatsapp_notification_sent?: boolean | null
          whatsapp_notification_sent_at?: string | null
          whatsapp_template_used?: string | null
        }
        Update: {
          applicant_email?: string | null
          applicant_id?: string
          applicant_metadata?: Json | null
          applicant_name?: string | null
          applicant_phone?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          issues?: Json
          metadata?: Json | null
          order_id?: string | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string | null
          whatsapp_contact_id?: string | null
          whatsapp_correlation_id?: string | null
          whatsapp_message_id?: string | null
          whatsapp_notification_sent?: boolean | null
          whatsapp_notification_sent_at?: string | null
          whatsapp_template_used?: string | null
        }
        Relationships: []
      }
      cbb_contacts: {
        Row: {
          alerts_enabled: boolean | null
          branch: string | null
          cbb_contact_id: string | null
          cbb_created: boolean | null
          cbb_sync_attempts: number | null
          cbb_sync_error_count: number | null
          cbb_sync_last_attempt_at: string | null
          cbb_sync_last_error: string | null
          cbb_synced: boolean | null
          client_email: string | null
          client_name: string | null
          client_phone: string
          country_name_translated: string | null
          created_at: string | null
          id: string
          is_urgent: boolean | null
          language_code: string | null
          new_order_notification_sent: boolean | null
          new_order_notification_sent_at: string | null
          order_days: number | null
          order_id: string
          processing_days: number | null
          processing_days_translated: string | null
          product_country: string | null
          product_doc_type: string | null
          product_entries: string | null
          product_intent: string | null
          product_validity: string | null
          updated_at: string | null
          visa_document_validity_days: number | null
          visa_type_translated: string | null
        }
        Insert: {
          alerts_enabled?: boolean | null
          branch?: string | null
          cbb_contact_id?: string | null
          cbb_created?: boolean | null
          cbb_sync_attempts?: number | null
          cbb_sync_error_count?: number | null
          cbb_sync_last_attempt_at?: string | null
          cbb_sync_last_error?: string | null
          cbb_synced?: boolean | null
          client_email?: string | null
          client_name?: string | null
          client_phone: string
          country_name_translated?: string | null
          created_at?: string | null
          id?: string
          is_urgent?: boolean | null
          language_code?: string | null
          new_order_notification_sent?: boolean | null
          new_order_notification_sent_at?: string | null
          order_days?: number | null
          order_id: string
          processing_days?: number | null
          processing_days_translated?: string | null
          product_country?: string | null
          product_doc_type?: string | null
          product_entries?: string | null
          product_intent?: string | null
          product_validity?: string | null
          updated_at?: string | null
          visa_document_validity_days?: number | null
          visa_type_translated?: string | null
        }
        Update: {
          alerts_enabled?: boolean | null
          branch?: string | null
          cbb_contact_id?: string | null
          cbb_created?: boolean | null
          cbb_sync_attempts?: number | null
          cbb_sync_error_count?: number | null
          cbb_sync_last_attempt_at?: string | null
          cbb_sync_last_error?: string | null
          cbb_synced?: boolean | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string
          country_name_translated?: string | null
          created_at?: string | null
          id?: string
          is_urgent?: boolean | null
          language_code?: string | null
          new_order_notification_sent?: boolean | null
          new_order_notification_sent_at?: string | null
          order_days?: number | null
          order_id?: string
          processing_days?: number | null
          processing_days_translated?: string | null
          product_country?: string | null
          product_doc_type?: string | null
          product_entries?: string | null
          product_intent?: string | null
          product_validity?: string | null
          updated_at?: string | null
          visa_document_validity_days?: number | null
          visa_type_translated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cbb_contacts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
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
          cbb_contact_uuid: string | null
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
          extra_data: Json | null
          extra_nationality_data: Json | null
          face_url: string | null
          family_data: Json | null
          file_transfer_method: string | null
          files_data: Json | null
          form_id: string
          form_meta_data: Json | null
          id: string
          is_urgent: boolean | null
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
          processing_days: number | null
          product_country: string
          product_country_flag: string | null
          product_data: Json | null
          product_doc_name: string | null
          product_doc_type: string | null
          product_entries: string | null
          product_intent: string | null
          product_validity: string | null
          updated_at: string | null
          visa_details: Json | null
          visa_document_validity_days: number | null
          visa_entries: string | null
          visa_notification_message_id: string | null
          visa_notification_sent: boolean | null
          visa_notification_sent_at: string | null
          visa_quantity: number | null
          visa_usage_deadline_days: number | null
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
          cbb_contact_uuid?: string | null
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
          extra_data?: Json | null
          extra_nationality_data?: Json | null
          face_url?: string | null
          family_data?: Json | null
          file_transfer_method?: string | null
          files_data?: Json | null
          form_id: string
          form_meta_data?: Json | null
          id?: string
          is_urgent?: boolean | null
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
          processing_days?: number | null
          product_country: string
          product_country_flag?: string | null
          product_data?: Json | null
          product_doc_name?: string | null
          product_doc_type?: string | null
          product_entries?: string | null
          product_intent?: string | null
          product_validity?: string | null
          updated_at?: string | null
          visa_details?: Json | null
          visa_document_validity_days?: number | null
          visa_entries?: string | null
          visa_notification_message_id?: string | null
          visa_notification_sent?: boolean | null
          visa_notification_sent_at?: string | null
          visa_quantity?: number | null
          visa_usage_deadline_days?: number | null
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
          cbb_contact_uuid?: string | null
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
          extra_data?: Json | null
          extra_nationality_data?: Json | null
          face_url?: string | null
          family_data?: Json | null
          file_transfer_method?: string | null
          files_data?: Json | null
          form_id?: string
          form_meta_data?: Json | null
          id?: string
          is_urgent?: boolean | null
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
          processing_days?: number | null
          product_country?: string
          product_country_flag?: string | null
          product_data?: Json | null
          product_doc_name?: string | null
          product_doc_type?: string | null
          product_entries?: string | null
          product_intent?: string | null
          product_validity?: string | null
          updated_at?: string | null
          visa_details?: Json | null
          visa_document_validity_days?: number | null
          visa_entries?: string | null
          visa_notification_message_id?: string | null
          visa_notification_sent?: boolean | null
          visa_notification_sent_at?: string | null
          visa_quantity?: number | null
          visa_usage_deadline_days?: number | null
          webhook_received_at?: string
          whatsapp_alerts_enabled?: boolean | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_cbb_contact_uuid_fkey"
            columns: ["cbb_contact_uuid"]
            isOneToOne: false
            referencedRelation: "cbb_contacts"
            referencedColumns: ["id"]
          },
        ]
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
      scraper_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          credentials: Json
          document_url: string | null
          downloaded_at: string | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          file_size: number | null
          filename: string | null
          id: string
          job_id: string
          max_retries: number | null
          metadata: Json | null
          mime_type: string | null
          order_id: string | null
          retry_after: string | null
          retry_count: number | null
          scraper_type: string
          screenshots: Json | null
          should_retry: boolean | null
          signed_url: string | null
          started_at: string | null
          status: string
          updated_at: string | null
          webhook_sent: boolean | null
          webhook_url: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          credentials: Json
          document_url?: string | null
          downloaded_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          file_size?: number | null
          filename?: string | null
          id?: string
          job_id: string
          max_retries?: number | null
          metadata?: Json | null
          mime_type?: string | null
          order_id?: string | null
          retry_after?: string | null
          retry_count?: number | null
          scraper_type: string
          screenshots?: Json | null
          should_retry?: boolean | null
          signed_url?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          webhook_sent?: boolean | null
          webhook_url?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          credentials?: Json
          document_url?: string | null
          downloaded_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          file_size?: number | null
          filename?: string | null
          id?: string
          job_id?: string
          max_retries?: number | null
          metadata?: Json | null
          mime_type?: string | null
          order_id?: string | null
          retry_after?: string | null
          retry_count?: number | null
          scraper_type?: string
          screenshots?: Json | null
          should_retry?: boolean | null
          signed_url?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          webhook_sent?: boolean | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scraper_jobs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
        ]
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
      whatsapp_conversations: {
        Row: {
          category: string
          conversation_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_billable: boolean | null
          phone_number: string
          pricing_model: string
          pricing_type: string | null
        }
        Insert: {
          category: string
          conversation_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_billable?: boolean | null
          phone_number: string
          pricing_model: string
          pricing_type?: string | null
        }
        Update: {
          category?: string
          conversation_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_billable?: boolean | null
          phone_number?: string
          pricing_model?: string
          pricing_type?: string | null
        }
        Relationships: []
      }
      whatsapp_message_retries: {
        Row: {
          created_at: string | null
          id: string
          last_retry_at: string | null
          message_id: string | null
          next_retry_at: string | null
          retry_count: number | null
          retry_reason: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_retry_at?: string | null
          message_id?: string | null
          next_retry_at?: string | null
          retry_count?: number | null
          retry_reason?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_retry_at?: string | null
          message_id?: string | null
          next_retry_at?: string | null
          retry_count?: number | null
          retry_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_retries_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["message_id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          alerts_enabled: boolean | null
          confirmation_sent: boolean | null
          confirmation_sent_at: string | null
          conversation_category: string | null
          conversation_id: string | null
          created_at: string | null
          delivered_at: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          is_billable: boolean | null
          message_id: string | null
          meta_message_id: string | null
          order_id: string | null
          phone_number: string
          pricing_model: string | null
          pricing_type: string | null
          read_at: string | null
          sent_at: string | null
          status: string
          template_name: string | null
          template_variables: Json | null
          updated_at: string | null
          webhook_events: Json | null
        }
        Insert: {
          alerts_enabled?: boolean | null
          confirmation_sent?: boolean | null
          confirmation_sent_at?: string | null
          conversation_category?: string | null
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          is_billable?: boolean | null
          message_id?: string | null
          meta_message_id?: string | null
          order_id?: string | null
          phone_number: string
          pricing_model?: string | null
          pricing_type?: string | null
          read_at?: string | null
          sent_at?: string | null
          status: string
          template_name?: string | null
          template_variables?: Json | null
          updated_at?: string | null
          webhook_events?: Json | null
        }
        Update: {
          alerts_enabled?: boolean | null
          confirmation_sent?: boolean | null
          confirmation_sent_at?: string | null
          conversation_category?: string | null
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          is_billable?: boolean | null
          message_id?: string | null
          meta_message_id?: string | null
          order_id?: string | null
          phone_number?: string
          pricing_model?: string | null
          pricing_type?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          template_name?: string | null
          template_variables?: Json | null
          updated_at?: string | null
          webhook_events?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
        ]
      }
      whatsapp_template_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          language: string
          new_status: string | null
          old_status: string | null
          quality_score_change: number | null
          template_name: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          language: string
          new_status?: string | null
          old_status?: string | null
          quality_score_change?: number | null
          template_name: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          language?: string
          new_status?: string | null
          old_status?: string | null
          quality_score_change?: number | null
          template_name?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          category: string | null
          compliance_status: string | null
          components: Json
          correct_category: string | null
          created_at: string | null
          id: string
          language: string
          last_synced_at: string | null
          quality_score: number | null
          status: string
          template_name: string
          updated_at: string | null
          usage_analytics: Json | null
          variables_count: number | null
        }
        Insert: {
          category?: string | null
          compliance_status?: string | null
          components: Json
          correct_category?: string | null
          created_at?: string | null
          id?: string
          language: string
          last_synced_at?: string | null
          quality_score?: number | null
          status: string
          template_name: string
          updated_at?: string | null
          usage_analytics?: Json | null
          variables_count?: number | null
        }
        Update: {
          category?: string | null
          compliance_status?: string | null
          components?: Json
          correct_category?: string | null
          created_at?: string | null
          id?: string
          language?: string
          last_synced_at?: string | null
          quality_score?: number | null
          status?: string
          template_name?: string
          updated_at?: string | null
          usage_analytics?: Json | null
          variables_count?: number | null
        }
        Relationships: []
      }
      whatsapp_webhook_events: {
        Row: {
          challenge: string | null
          created_at: string | null
          details: Json | null
          event_type: string | null
          forwarded_to_zapier: boolean | null
          id: string
          message_id: string | null
          method: string
          payload: Json | null
          phone_number: string | null
          processing_status: string | null
          signature_verified: boolean | null
          status: string
          timestamp: string | null
        }
        Insert: {
          challenge?: string | null
          created_at?: string | null
          details?: Json | null
          event_type?: string | null
          forwarded_to_zapier?: boolean | null
          id?: string
          message_id?: string | null
          method: string
          payload?: Json | null
          phone_number?: string | null
          processing_status?: string | null
          signature_verified?: boolean | null
          status: string
          timestamp?: string | null
        }
        Update: {
          challenge?: string | null
          created_at?: string | null
          details?: Json | null
          event_type?: string | null
          forwarded_to_zapier?: boolean | null
          id?: string
          message_id?: string | null
          method?: string
          payload?: Json | null
          phone_number?: string | null
          processing_status?: string | null
          signature_verified?: boolean | null
          status?: string
          timestamp?: string | null
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
        Args: never
        Returns: {
          error_count: number
          inserted_count: number
          skipped_count: number
        }[]
      }
      calculate_processing_days_with_rule: {
        Args: {
          p_country: string
          p_order_amount?: number
          p_urgency?: string
          p_visa_type?: string
        }
        Returns: {
          processing_days: number
          rule_id: string
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
