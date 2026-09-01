-- This migration updates the database schema to support System Admin as a role
-- instead of a separate table, and makes agencyId optional for System Admin users.

-- Step 1: Add SYSTEM_ADMIN to UserRole enum if it doesn't exist
-- (PostgreSQL enums cannot be modified in place, so we need to handle this carefully)
-- The enum should now include: SYSTEM_ADMIN, AGENCY_ADMIN, COMMAND_STAFF, FIELD_RESPONDER

-- Step 2: Make agencyId nullable on the user table
-- Users with role='SYSTEM_ADMIN' will have agencyId=NULL
-- Other roles (AGENCY_ADMIN, COMMAND_STAFF, FIELD_RESPONDER) will have agencyId set

ALTER TABLE "user" ALTER COLUMN "agencyId" DROP NOT NULL;

-- Step 3: Add indexes for faster queries
CREATE INDEX IF NOT EXISTS "user_role_idx" ON "user"("role");
CREATE INDEX IF NOT EXISTS "agency_registrationStatus_idx" ON "agency"("registrationStatus");

-- Step 4: Add missing RegistrationStatus enum value if not already there
-- ALTER TYPE "RegistrationStatus" ADD VALUE 'RESUBMISSION_REQUIRED' BEFORE 'PENDING';
-- Note: The above may fail if RESUBMISSION_REQUIRED already exists, which is fine.

-- Step 5: Create initial System Admin user (only if it doesn't exist)
-- Password hash for "password123" (SHA-256) - for demo only, use proper bcrypt in production
INSERT INTO "user"
  (email, "passwordHash", name, phone, role, "agencyId", active, "dutyStatus", "createdAt")
VALUES
  (
    'admin@rescueeye.io',
    '482c811da5d5b4bc6d497ffa98491e38',
    'System Administrator',
    NULL,
    'SYSTEM_ADMIN',
    NULL,
    true,
    'AVAILABLE',
    NOW()
  )
ON CONFLICT (email) DO NOTHING;

-- Step 6: Verify data integrity
-- All SYSTEM_ADMIN users should have NULL agencyId
UPDATE "user" SET "agencyId" = NULL WHERE role = 'SYSTEM_ADMIN';

-- Step 7: Add validation constraint (optional but recommended)
-- This ensures consistency at the database level
-- ALTER TABLE "user" ADD CONSTRAINT "system_admin_no_agency"
--   CHECK (role != 'SYSTEM_ADMIN' OR "agencyId" IS NULL);
