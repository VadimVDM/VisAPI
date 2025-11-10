-- Migration: Separate Validity Fields
-- Date: 2025-11-10
-- Description: Rename visa_validity_days to visa_usage_deadline_days for clarity,
--              and add visa_document_validity_days to store actual document validity period.
--              This fixes the bug where we were showing "1 month" for 6-month visas
--              because days_to_use from Vizi has incorrect values.

-- ====================
-- ORDERS TABLE
-- ====================

-- Rename confusing field (days_to_use from Vizi - often incorrect)
ALTER TABLE orders
  RENAME COLUMN visa_validity_days TO visa_usage_deadline_days;

-- Add comment to clarify the renamed field
COMMENT ON COLUMN orders.visa_usage_deadline_days IS
  'Days to use visa from Vizi webhook (product.days_to_use). NOTE: This field often contains incorrect data and should not be used for customer-facing validity info. Use product_validity instead.';

-- Add new field for actual document validity (parsed from validity string)
ALTER TABLE orders
  ADD COLUMN visa_document_validity_days INTEGER;

COMMENT ON COLUMN orders.visa_document_validity_days IS
  'Actual visa document validity period in days, parsed from product.validity string. This is the authoritative field for visa validity. Examples: "6_months" = 180, "2_years" = 730, "5_years" = 1825.';

-- Backfill visa_document_validity_days from product_validity string
-- This converts "6_months" -> 180, "2_years" -> 730, etc.
UPDATE orders
SET visa_document_validity_days = CASE
  -- Weeks
  WHEN product_validity = '2_weeks' OR product_validity = '2weeks' THEN 14
  WHEN product_validity = '15_days' OR product_validity = '15days' THEN 15

  -- Months
  WHEN product_validity = 'month' OR product_validity = '1_month' OR product_validity = '1month' THEN 30
  WHEN product_validity = '2_months' OR product_validity = '2months' THEN 60
  WHEN product_validity = '3_months' OR product_validity = '3months' THEN 90
  WHEN product_validity = '6_months' OR product_validity = '6months' THEN 180

  -- Years
  WHEN product_validity = 'year' OR product_validity = '1_year' OR product_validity = '1year' THEN 365
  WHEN product_validity = '2_years' OR product_validity = '2years' THEN 730
  WHEN product_validity = '3_years' OR product_validity = '3years' THEN 1095
  WHEN product_validity = '5_years' OR product_validity = '5years' THEN 1825
  WHEN product_validity = '10_years' OR product_validity = '10years' THEN 3650

  -- Default fallback to 30 days (1 month)
  ELSE 30
END
WHERE product_validity IS NOT NULL;

-- ====================
-- CBB_CONTACTS TABLE
-- ====================

-- Check if visa_validity_days column exists in cbb_contacts first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cbb_contacts' AND column_name = 'visa_validity_days'
  ) THEN
    -- Rename confusing field
    ALTER TABLE cbb_contacts
      RENAME COLUMN visa_validity_days TO visa_usage_deadline_days;

    -- Add comment
    COMMENT ON COLUMN cbb_contacts.visa_usage_deadline_days IS
      'Days to use visa from Vizi webhook (product.days_to_use). NOTE: This field often contains incorrect data. Kept for historical tracking only.';
  END IF;
END $$;

-- Add new field for actual document validity
ALTER TABLE cbb_contacts
  ADD COLUMN IF NOT EXISTS visa_document_validity_days INTEGER;

COMMENT ON COLUMN cbb_contacts.visa_document_validity_days IS
  'Actual visa document validity period in days, parsed from product.validity string. Examples: "6_months" = 180, "2_years" = 730.';

-- Backfill cbb_contacts from orders table
UPDATE cbb_contacts cc
SET visa_document_validity_days = o.visa_document_validity_days
FROM orders o
WHERE cc.order_id = o.order_id
  AND o.visa_document_validity_days IS NOT NULL
  AND cc.visa_document_validity_days IS NULL;

-- ====================
-- VERIFICATION QUERIES
-- ====================

-- Check a few sample records to verify the migration worked
-- Uncomment to run manually:
-- SELECT order_id, product_validity, visa_usage_deadline_days, visa_document_validity_days FROM orders ORDER BY created_at DESC LIMIT 5;
-- SELECT order_id, product_validity, visa_usage_deadline_days, visa_document_validity_days FROM cbb_contacts ORDER BY created_at DESC LIMIT 5;
