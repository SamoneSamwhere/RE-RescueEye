-- Structured PSGC codes for an agency's office address.
--
-- The "address" column keeps the single formatted line for display
-- ("Street, Brgy. X, City, Province 6000"); these columns store the official
-- PSGC codes for the region, province, city/municipality, and barangay
-- picked via the cascading address dropdowns (see lib/psgc.ts and
-- data/components/address/PhilippineAddressFields.tsx). Codes, not names,
-- are the source of truth, so an agency's location can be resolved or
-- queried without re-parsing the free-text address line.
--
-- Run this in the Supabase SQL editor. Until it is run, registration still
-- works but saves the agency without these codes (see
-- hooks/useAgencyDatabase.ts), so run it before relying on them.
--
-- No province code for NCR agencies — the region has no province level.

ALTER TABLE "agency" ADD COLUMN IF NOT EXISTS "addressRegionCode" VARCHAR(9);
ALTER TABLE "agency" ADD COLUMN IF NOT EXISTS "addressProvinceCode" VARCHAR(9);
ALTER TABLE "agency" ADD COLUMN IF NOT EXISTS "addressCityCode" VARCHAR(9);
ALTER TABLE "agency" ADD COLUMN IF NOT EXISTS "addressBarangayCode" VARCHAR(9);
