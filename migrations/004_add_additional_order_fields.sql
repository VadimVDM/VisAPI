-- Migration: Add additional fields for multi-applicant orders
-- Description: Add fields for Israeli/Indian visa applications

-- Add new columns to applicants table
ALTER TABLE applicants 
ADD COLUMN IF NOT EXISTS id_number text,
ADD COLUMN IF NOT EXISTS passport_place_of_issue text,
ADD COLUMN IF NOT EXISTS crime text,
ADD COLUMN IF NOT EXISTS religion text,
ADD COLUMN IF NOT EXISTS military jsonb, -- {served, role, rank}
ADD COLUMN IF NOT EXISTS past_travels jsonb; -- Complex travel history

-- Add business table for business visa applications
CREATE TABLE IF NOT EXISTS business_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  name text,
  sector text,
  website text,
  address_line text,
  address_city text,
  address_country text,
  phone jsonb, -- {code, number}
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_applicants_id_number ON applicants(id_number);
CREATE INDEX IF NOT EXISTS idx_business_info_order_id ON business_info(order_id);

-- Enable RLS on business_info
ALTER TABLE business_info ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for business_info
CREATE POLICY "Enable read access for authenticated users" ON business_info
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON business_info
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service role" ON business_info
  FOR UPDATE USING (auth.role() = 'service_role');

-- Add update trigger for business_info
CREATE TRIGGER update_business_info_updated_at BEFORE UPDATE ON business_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE business_info IS 'Stores business information for business visa applications';