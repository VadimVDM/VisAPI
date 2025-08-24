-- Migration: Add fields for Korean visa applications
-- Description: Add fields specific to Korean K-ETA applications

-- Add new columns to applicants table
ALTER TABLE applicants 
ADD COLUMN IF NOT EXISTS visited boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS city_of_birth text,
ADD COLUMN IF NOT EXISTS last_travel jsonb; -- {traveled, country, from, until}

-- Add new columns to form_metadata table
ALTER TABLE form_metadata
ADD COLUMN IF NOT EXISTS children jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stay_address text;

-- Update form_metadata to store product variations
ALTER TABLE form_metadata
ALTER COLUMN product TYPE jsonb USING product::jsonb;

-- Add comment
COMMENT ON COLUMN applicants.visited IS 'Whether applicant has visited the country before';
COMMENT ON COLUMN applicants.city_of_birth IS 'City of birth for applicant';
COMMENT ON COLUMN applicants.last_travel IS 'Last international travel details';
COMMENT ON COLUMN form_metadata.children IS 'Array of children traveling with applicants';
COMMENT ON COLUMN form_metadata.stay_address IS 'Address where staying in destination country';