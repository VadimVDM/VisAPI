-- Migration: Create orders tables for n8n webhook data
-- Description: Tables to store visa order data from n8n.visanet.app

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL, -- External order ID (e.g., "RU250731IL1")
  form_id text NOT NULL, -- External form ID
  payment_id text,
  payment_processor text,
  amount numeric(10,2),
  currency text,
  coupon text,
  status text NOT NULL DEFAULT 'active',
  branch text,
  domain text,
  raw_data jsonb NOT NULL, -- Store complete raw data for reference
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create applicants table
CREATE TABLE IF NOT EXISTS applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  applicant_id text NOT NULL, -- External applicant ID
  
  -- Passport information
  passport_nationality text,
  passport_first_name text,
  passport_last_name text,
  passport_sex text,
  passport_date_of_birth date,
  passport_country_of_birth text,
  passport_number text,
  passport_date_of_issue date,
  passport_date_of_expiry date,
  
  -- Past visit information
  past_visit_visited boolean DEFAULT false,
  past_visit_year text,
  
  -- Address information
  address_line text,
  address_city text,
  address_country text,
  
  -- Occupation information
  occupation_education text,
  occupation_status text,
  occupation_name text,
  occupation_seniority text,
  occupation_phone jsonb, -- {code, number}
  occupation_address jsonb, -- {line, city, country}
  
  -- Extra nationality
  extra_nationality_status text,
  
  -- Family information
  family_data jsonb, -- Store complete family structure
  
  -- File URLs
  files jsonb, -- Store all file URLs
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create form_metadata table
CREATE TABLE IF NOT EXISTS form_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  form_id text NOT NULL,
  country text,
  entry_date date,
  entry_port text,
  product jsonb, -- Store complete product information
  quantity integer,
  urgency text,
  client jsonb, -- Store client information
  meta jsonb, -- Store form metadata (url, branch, domain, etc.)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create webhook_logs table for tracking incoming webhooks
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL, -- e.g., 'n8n.visanet.app'
  endpoint text NOT NULL,
  method text NOT NULL,
  headers jsonb,
  body jsonb,
  status_code integer,
  response jsonb,
  error text,
  processing_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_applicants_order_id ON applicants(order_id);
CREATE INDEX idx_applicants_applicant_id ON applicants(applicant_id);
CREATE INDEX idx_form_metadata_order_id ON form_metadata(order_id);
CREATE INDEX idx_form_metadata_form_id ON form_metadata(form_id);
CREATE INDEX idx_webhook_logs_source ON webhook_logs(source);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your security requirements)
-- For now, we'll create basic policies that allow authenticated users to read all data

-- Orders policies
CREATE POLICY "Enable read access for authenticated users" ON orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON orders
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service role" ON orders
  FOR UPDATE USING (auth.role() = 'service_role');

-- Applicants policies
CREATE POLICY "Enable read access for authenticated users" ON applicants
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON applicants
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service role" ON applicants
  FOR UPDATE USING (auth.role() = 'service_role');

-- Form metadata policies
CREATE POLICY "Enable read access for authenticated users" ON form_metadata
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON form_metadata
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service role" ON form_metadata
  FOR UPDATE USING (auth.role() = 'service_role');

-- Webhook logs policies
CREATE POLICY "Enable read access for authenticated users" ON webhook_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON webhook_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applicants_updated_at BEFORE UPDATE ON applicants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_metadata_updated_at BEFORE UPDATE ON form_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment to tables
COMMENT ON TABLE orders IS 'Stores visa orders from n8n.visanet.app webhook';
COMMENT ON TABLE applicants IS 'Stores applicant information for visa orders';
COMMENT ON TABLE form_metadata IS 'Stores form metadata and product information';
COMMENT ON TABLE webhook_logs IS 'Logs all incoming webhook requests for debugging';