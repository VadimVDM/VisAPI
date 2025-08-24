-- WhatsApp Business API Tables Migration
-- Created: August 23, 2025
-- Purpose: Support direct Meta WhatsApp Business API integration with enhanced 2025 features

-- Add delivery tracking columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS whatsapp_delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS whatsapp_read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS whatsapp_failed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS whatsapp_failure_reason TEXT;

-- Add translation columns to orders table for optimization
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_country_hebrew TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_country_flag TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS visa_type_hebrew TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processing_days_hebrew TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS urgency_hebrew TEXT;

-- Enhanced webhook events table with signature verification support
CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_type TEXT,
  message_id TEXT,
  phone_number TEXT,
  details JSONB,
  challenge TEXT,
  payload JSONB,
  signature_verified BOOLEAN DEFAULT FALSE,
  processing_status TEXT DEFAULT 'received',
  forwarded_to_zapier BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced templates table with quality monitoring
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL,
  status TEXT NOT NULL,
  category TEXT,
  components JSONB NOT NULL,
  variables_count INTEGER,
  quality_score INTEGER,
  usage_analytics JSONB,
  compliance_status TEXT,
  correct_category TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced message tracking with conversation support
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT REFERENCES orders(order_id),
  message_id TEXT UNIQUE,
  template_name TEXT,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL, -- queued, sent, delivered, read, failed
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  template_variables JSONB,
  conversation_id TEXT,
  conversation_category TEXT,
  pricing_model TEXT,
  is_billable BOOLEAN DEFAULT true,
  pricing_type TEXT,
  webhook_events JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add conversation tracking table
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT UNIQUE NOT NULL,
  phone_number TEXT NOT NULL,
  category TEXT NOT NULL,
  pricing_model TEXT NOT NULL,
  is_billable BOOLEAN DEFAULT true,
  pricing_type TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template status history for audit
CREATE TABLE IF NOT EXISTS whatsapp_template_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  language TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  quality_score_change INTEGER,
  changed_by TEXT,
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message retry history
CREATE TABLE IF NOT EXISTS whatsapp_message_retries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT REFERENCES whatsapp_messages(message_id),
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  retry_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_order_id ON whatsapp_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_number ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone_number ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_category ON whatsapp_conversations(category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_expires_at ON whatsapp_conversations(expires_at);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_timestamp ON whatsapp_webhook_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_event_type ON whatsapp_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_message_id ON whatsapp_webhook_events(message_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_quality_score ON whatsapp_templates(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_category ON whatsapp_templates(category);

-- Row Level Security (RLS) policies
ALTER TABLE whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_template_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_retries ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to webhook events" ON whatsapp_webhook_events
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to templates" ON whatsapp_templates
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to messages" ON whatsapp_messages
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to conversations" ON whatsapp_conversations
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to template history" ON whatsapp_template_history
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to message retries" ON whatsapp_message_retries
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers for updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_messages_updated_at BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to track template quality changes
CREATE OR REPLACE FUNCTION track_template_quality_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.quality_score IS DISTINCT FROM NEW.quality_score OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO whatsapp_template_history (
      template_name,
      language,
      old_status,
      new_status,
      quality_score_change,
      changed_by,
      change_reason
    ) VALUES (
      NEW.template_name,
      NEW.language,
      OLD.status,
      NEW.status,
      COALESCE(NEW.quality_score, 0) - COALESCE(OLD.quality_score, 0),
      current_user,
      'Automatic tracking'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_template_changes AFTER UPDATE ON whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION track_template_quality_change();

-- Grant permissions to authenticated users for read access
GRANT SELECT ON whatsapp_webhook_events TO authenticated;
GRANT SELECT ON whatsapp_templates TO authenticated;
GRANT SELECT ON whatsapp_messages TO authenticated;
GRANT SELECT ON whatsapp_conversations TO authenticated;
GRANT SELECT ON whatsapp_template_history TO authenticated;
GRANT SELECT ON whatsapp_message_retries TO authenticated;