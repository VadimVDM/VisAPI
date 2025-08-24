-- Processing Rules Tables for WhatsApp Business Notifications
-- Created: August 25, 2025
-- Purpose: Store business rules for calculating processing times

-- Main processing rules table
CREATE TABLE IF NOT EXISTS processing_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 0, -- Higher priority rules are evaluated first
  is_active BOOLEAN DEFAULT true,
  
  -- Conditions (all must match for rule to apply)
  conditions JSONB NOT NULL DEFAULT '{}',
  -- Example conditions:
  -- {
  --   "country": ["morocco", "vietnam"],
  --   "urgency": ["urgent", "express"],
  --   "visa_type": ["tourist", "business"],
  --   "order_amount": { "min": 100, "max": 500 }
  -- }
  
  -- Actions to take when conditions match
  actions JSONB NOT NULL,
  -- Example actions:
  -- {
  --   "processing_days": 5,
  --   "business_days": true,
  --   "custom_message": "Special processing for this visa type"
  -- }
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Create indexes for performance
CREATE INDEX idx_processing_rules_priority ON processing_rules(priority DESC) WHERE is_active = true;
CREATE INDEX idx_processing_rules_conditions ON processing_rules USING GIN (conditions);

-- Audit log for rule changes
CREATE TABLE IF NOT EXISTS processing_rules_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES processing_rules(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'activated', 'deactivated'
  old_values JSONB,
  new_values JSONB,
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add processing_days column to orders table if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS processing_days INTEGER,
ADD COLUMN IF NOT EXISTS processing_days_calculated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS processing_rule_id UUID REFERENCES processing_rules(id);

-- Create default rules based on current business logic
INSERT INTO processing_rules (name, description, priority, conditions, actions) VALUES
  -- Urgent orders (highest priority)
  ('Urgent Orders - All Countries', 'All urgent orders process in 1 business day', 100, 
   '{"urgency": ["urgent", "express"]}',
   '{"processing_days": 1, "business_days": true}'),
  
  -- Morocco specific rule
  ('Morocco Standard Processing', 'Morocco visas take 5 business days', 50,
   '{"country": ["morocco"], "urgency": ["standard", "normal", null]}',
   '{"processing_days": 5, "business_days": true}'),
  
  -- Vietnam specific rule
  ('Vietnam Standard Processing', 'Vietnam visas take 7 business days', 50,
   '{"country": ["vietnam"], "urgency": ["standard", "normal", null]}',
   '{"processing_days": 7, "business_days": true}'),
  
  -- Default rule (lowest priority)
  ('Default Processing Time', 'Standard processing for all other countries', 0,
   '{}',
   '{"processing_days": 3, "business_days": true}')
ON CONFLICT DO NOTHING;

-- Function to calculate processing days based on rules
CREATE OR REPLACE FUNCTION calculate_processing_days(
  p_country TEXT,
  p_urgency TEXT DEFAULT NULL,
  p_visa_type TEXT DEFAULT NULL,
  p_order_amount NUMERIC DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_rule RECORD;
  v_processing_days INTEGER;
BEGIN
  -- Find the highest priority matching rule
  FOR v_rule IN
    SELECT * FROM processing_rules
    WHERE is_active = true
    ORDER BY priority DESC
  LOOP
    -- Check if all conditions match
    IF (
      -- Country condition
      (v_rule.conditions->>'country' IS NULL OR 
       p_country = ANY(SELECT jsonb_array_elements_text(v_rule.conditions->'country')))
      AND
      -- Urgency condition
      (v_rule.conditions->>'urgency' IS NULL OR 
       p_urgency = ANY(SELECT jsonb_array_elements_text(v_rule.conditions->'urgency')) OR
       (p_urgency IS NULL AND 'null' = ANY(SELECT jsonb_array_elements_text(v_rule.conditions->'urgency'))))
      AND
      -- Visa type condition
      (v_rule.conditions->>'visa_type' IS NULL OR 
       p_visa_type = ANY(SELECT jsonb_array_elements_text(v_rule.conditions->'visa_type')))
      AND
      -- Order amount condition
      (v_rule.conditions->>'order_amount' IS NULL OR
       (p_order_amount >= COALESCE((v_rule.conditions->'order_amount'->>'min')::NUMERIC, 0) AND
        p_order_amount <= COALESCE((v_rule.conditions->'order_amount'->>'max')::NUMERIC, 999999)))
    ) THEN
      -- Rule matches, return processing days
      RETURN (v_rule.actions->>'processing_days')::INTEGER;
    END IF;
  END LOOP;
  
  -- No matching rule found, return default
  RETURN 3;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate processing days on order insert/update
CREATE OR REPLACE FUNCTION update_order_processing_days()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate processing days based on order details
  NEW.processing_days := calculate_processing_days(
    LOWER(NEW.product_country),
    LOWER(NEW.urgency),
    LOWER(NEW.product_doc_type),
    NEW.amount
  );
  NEW.processing_days_calculated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new orders
DROP TRIGGER IF EXISTS calculate_processing_days_trigger ON orders;
CREATE TRIGGER calculate_processing_days_trigger
  BEFORE INSERT OR UPDATE OF product_country, urgency, product_doc_type, amount
  ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_processing_days();

-- Update existing orders with calculated processing days
UPDATE orders
SET 
  processing_days = calculate_processing_days(
    LOWER(product_country),
    LOWER(urgency),
    LOWER(product_doc_type),
    amount
  ),
  processing_days_calculated_at = NOW()
WHERE processing_days IS NULL;

-- Create RLS policies
ALTER TABLE processing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_rules_audit ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON processing_rules
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access audit" ON processing_rules_audit
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Authenticated users can read active rules
CREATE POLICY "Authenticated users can read active rules" ON processing_rules
  FOR SELECT USING (is_active = true AND auth.role() = 'authenticated');

-- Comments for documentation
COMMENT ON TABLE processing_rules IS 'Business rules for calculating order processing times';
COMMENT ON COLUMN processing_rules.priority IS 'Higher priority rules are evaluated first (0-1000)';
COMMENT ON COLUMN processing_rules.conditions IS 'JSON conditions that must all match for rule to apply';
COMMENT ON COLUMN processing_rules.actions IS 'JSON actions to take when rule matches';
COMMENT ON COLUMN orders.processing_days IS 'Calculated processing days based on business rules';
COMMENT ON FUNCTION calculate_processing_days IS 'Calculate processing days for an order based on active rules';