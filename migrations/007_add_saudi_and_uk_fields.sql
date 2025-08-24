-- Add Saudi visa and UK ETA specific fields to applicants table
ALTER TABLE applicants
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS guardian_passport text;

-- Add UK ETA specific field to applicants table  
ALTER TABLE applicants
  ADD COLUMN IF NOT EXISTS address_set_by integer;

-- Create index for marital_status (commonly used in filtering)
CREATE INDEX IF NOT EXISTS idx_applicants_marital_status ON applicants(marital_status);

-- Add comment to document the flexible occupation field
COMMENT ON COLUMN applicants.occupation_status IS 'Can store either the status from complex occupation object or simple string value for Saudi visas';

-- Add comment for address_set_by field
COMMENT ON COLUMN applicants.address_set_by IS 'UK ETA specific field to track who set the address';