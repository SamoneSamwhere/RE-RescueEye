-- Organization registration: middle name for the person registering.
--
-- Registration now requires a middle name. Run this in the Supabase SQL editor.
-- Until it is run, sign-up still works but saves the admin without a middle name
-- (see hooks/useAgencyDatabase.ts), so run it before relying on the field.
--
-- Nullable because accounts created before this migration have no middle name,
-- and personnel created by an agency admin are not asked for one yet.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "middleName" VARCHAR(50);

-- The office address is stored as one formatted line in the existing "address"
-- column ("Street, Brgy. X, City, Province 6000"); no schema change needed.
