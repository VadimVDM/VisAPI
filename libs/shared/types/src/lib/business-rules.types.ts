/**
 * Business Rules Types
 * For managing processing times and other business logic
 */

/**
 * Processing rule condition types
 */
export interface ProcessingRuleConditions {
  country?: string[];
  urgency?: string[];
  visa_type?: string[];
  order_amount?: {
    min?: number;
    max?: number;
  };
  branch?: string[];
  customer_type?: string[];
}

/**
 * Processing rule action types
 */
export interface ProcessingRuleActions {
  processing_days: number | { min: number; max: number };
  business_days?: boolean;
  custom_message?: string;
  template_overrides?: Record<string, string>;
  expedited_available?: boolean;
  special_instructions?: string;
}

/**
 * Main processing rule entity
 */
export interface ProcessingRule {
  id: string;
  name: string;
  description?: string;
  priority: number; // Higher priority rules are evaluated first
  is_active: boolean;
  conditions: ProcessingRuleConditions;
  actions: ProcessingRuleActions;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

/**
 * Processing rule audit entry
 */
export interface ProcessingRuleAudit {
  id: string;
  rule_id: string;
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
  old_values?: ProcessingRule;
  new_values?: ProcessingRule;
  changed_by?: string;
  changed_at: string;
}

/**
 * Order processing context for rule evaluation
 */
export interface OrderProcessingContext {
  country: string;
  urgency?: string;
  visa_type?: string;
  order_amount?: number;
  branch?: string;
  customer_type?: string;
  order_id?: string;
  client_name?: string;
  [key: string]: any; // Allow additional context fields
}

/**
 * Result of processing rule evaluation
 */
export interface ProcessingRuleResult {
  processing_days: number;
  business_days: boolean;
  rule_id?: string;
  rule_name?: string;
  custom_message?: string;
  template_overrides?: Record<string, string>;
  expedited_available?: boolean;
  special_instructions?: string;
  calculated_at: string;
}

/**
 * Template context for WhatsApp messages
 */
export interface WhatsAppTemplateContext {
  processing_time: string; // "1 business day", "3-5 business days"
  expedited_available: boolean;
  special_instructions?: string;
  estimated_completion_date: string;
  custom_fields?: Record<string, any>;
}

/**
 * CBB custom field mapping for orders
 */
export interface CBBOrderFields {
  customer_name: string;
  visa_country: string;
  visa_type: string;
  OrderNumber: string;
  visa_quantity: string;
  order_urgent: string;
  order_priority: string;
  order_date: string;
  order_days: string; // Processing days calculated by rules engine
  visa_intent?: string;
  visa_entries?: string;
  visa_validity?: string;
  visa_flag?: string;
}

/**
 * Processing days calculation options
 */
export interface ProcessingDaysOptions {
  include_weekends?: boolean;
  holidays?: string[]; // ISO date strings of holidays to exclude
  timezone?: string; // Default: 'Asia/Jerusalem'
  buffer_days?: number; // Additional buffer days to add
}

/**
 * Rule validation result
 */
export interface RuleValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}