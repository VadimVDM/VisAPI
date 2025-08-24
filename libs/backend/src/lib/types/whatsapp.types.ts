export interface WhatsAppConfig {
  phoneNumberId: string;
  businessId: string;
  accessToken: string;
  verifyToken: string;
  apiVersion: string;
  webhookSecret: string;
  appSecret: string;
  webhookEndpoint: string;
  businessVerificationRequired: boolean;
  enableFlows: boolean;
  enableCatalogMessaging: boolean;
  conversationTrackingEnabled: boolean;
  templateQualityMonitoring: boolean;
  automatedTemplateSyncInterval: number;
}

export interface MessageResponse {
  messaging_product: string;
  contacts: Contact[];
  messages: Message[];
}

export interface Contact {
  input: string;
  wa_id: string;
}

export interface Message {
  id: string;
  message_status?: string;
}

export interface EnhancedMessageStatus {
  id: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  recipient: string;
  conversationId?: string;
  conversationCategory?: ConversationCategory;
  pricingModel?: 'CBP' | 'PMP';
  isBillable?: boolean;
  error?: {
    code: number;
    title: string;
    message: string;
    error_data?: any;
  };
}

export enum ConversationCategory {
  AUTHENTICATION = 'authentication',
  MARKETING = 'marketing',
  UTILITY = 'utility',
  SERVICE = 'service',
}

export interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link?: string;
    id?: string;
  };
  document?: {
    link?: string;
    id?: string;
    filename?: string;
  };
  video?: {
    link?: string;
    id?: string;
  };
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'footer' | 'button';
  sub_type?: string;
  index?: number;
  parameters?: TemplateParameter[];
}

export interface Template {
  id: string;
  name: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED';
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  components: TemplateComponent[];
  quality_score?: number;
  rejected_reason?: string;
  correct_category?: string;
}

export interface WebhookEvent {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: any;
  field: string;
}

export interface WebhookVerifyDto {
  'hub.mode': string;
  'hub.verify_token': string;
  'hub.challenge': string;
}

export interface MediaResponse {
  id: string;
  url?: string;
  mime_type?: string;
  sha256?: string;
  file_size?: number;
}

export interface BusinessInfo {
  id: string;
  name: string;
  vertical: string;
  verification_status: 'verified' | 'unverified' | 'pending';
  message_template_limit: number;
  messaging_limit_tier: string;
  quality_rating: string;
  status: string;
}

export interface TemplateAnalytics {
  template_name: string;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  click_through_rate?: number;
  quality_score: number;
  last_updated: Date;
}

export interface ConversationInfo {
  id: string;
  origin: {
    type: 'business_initiated' | 'customer_initiated' | 'referral_conversion';
  };
  category: ConversationCategory;
  expiration_timestamp: Date;
  is_billable: boolean;
  pricing_model: 'CBP' | 'PMP';
}

export interface EnhancedTemplate extends Template {
  usage_count?: number;
  last_used?: Date;
  performance_metrics?: {
    delivery_rate: number;
    read_rate: number;
    response_rate: number;
  };
  compliance_status?: 'compliant' | 'warning' | 'violation';
  optimization_suggestions?: string[];
}

export interface QualityMetrics {
  overall_score: number;
  delivery_rate: number;
  read_rate: number;
  block_rate: number;
  spam_rate: number;
  recommendations: string[];
}

export interface ComplianceReport {
  compliant_templates: number;
  warning_templates: number;
  violation_templates: number;
  details: Array<{
    template_name: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
}

export interface OptimizationSuggestion {
  type: 'content' | 'timing' | 'frequency' | 'personalization';
  description: string;
  expected_impact: string;
  implementation_difficulty: 'easy' | 'medium' | 'hard';
}

export interface PerformanceMetrics {
  template_name: string;
  time_range: {
    start: Date;
    end: Date;
  };
  metrics: {
    total_sent: number;
    delivered: number;
    read: number;
    replied: number;
    failed: number;
    avg_time_to_read: number;
    avg_time_to_reply: number;
  };
  trends: {
    delivery_rate_change: number;
    read_rate_change: number;
    engagement_change: number;
  };
}

export interface ConversationContext {
  conversation_id: string;
  category: ConversationCategory;
  is_billable: boolean;
  pricing_model: 'CBP' | 'PMP';
  expires_at: Date;
}

export interface SecurityContext {
  signature_verified: boolean;
  timestamp: Date;
  source_ip?: string;
  user_agent?: string;
}

export interface ComplianceViolation {
  template_name: string;
  violation_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommended_action: string;
  deadline?: Date;
}

export interface EnhancedDashboardStats {
  messageStats: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
  conversationStats: {
    active: number;
    total_today: number;
    by_category: Record<ConversationCategory, number>;
    billable: number;
    free: number;
  };
  templateStats: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    avg_quality_score: number;
  };
  businessMetrics: {
    verification_status: string;
    messaging_limit: string;
    quality_rating: string;
    template_limit: number;
  };
  complianceStatus: {
    score: number;
    issues: number;
    warnings: number;
  };
}

export interface ConversationAnalytics {
  total_conversations: number;
  by_category: Record<ConversationCategory, number>;
  by_pricing_model: {
    CBP: number;
    PMP: number;
  };
  estimated_cost: number;
  cost_savings: number;
  optimization_opportunities: string[];
}

export interface TemplateQualityDashboard {
  templates: Array<{
    name: string;
    quality_score: number;
    trend: 'up' | 'down' | 'stable';
    issues: string[];
    last_checked: Date;
  }>;
  overall_health: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

export interface BusinessVerificationStatus {
  is_verified: boolean;
  verification_status: string;
  capabilities: string[];
  limitations: string[];
  next_steps?: string[];
}

export interface EnhancedValidationResult {
  is_valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    suggestion?: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
  template_quality_impact?: number;
}

export interface EnhancedDailyStats {
  date: Date;
  messages: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
  conversations: {
    total: number;
    billable: number;
    by_category: Record<ConversationCategory, number>;
  };
  templates: {
    most_used: Array<{ name: string; count: number }>;
    quality_alerts: number;
    compliance_issues: number;
  };
  costs: {
    estimated: number;
    actual?: number;
    savings: number;
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
  };
}
