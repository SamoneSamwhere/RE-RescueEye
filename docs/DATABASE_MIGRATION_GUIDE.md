# Database Migration Guide: System Admin & Supabase Integration

## Overview

This guide explains the database schema changes and how to implement them in your Supabase database.

### What Changed

1. **Added `SYSTEM_ADMIN` to UserRole enum** - System Admin is now a role in the `USER` table, not a separate table
2. **Made `agencyId` optional** - System Admin users have `agencyId = NULL`
3. **Fixed schema inconsistencies** - Removed references to undefined `PlatformAdmin` model
4. **Created database hooks** - New `useUserDatabase.ts` and updated `useAgencyDatabase.ts` for Supabase queries
5. **Added seed script** - Initial System Admin is created automatically

## Prerequisites

- Supabase project created and configured
- Environment variables set (`.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)
- Prisma CLI installed (`npm install -D prisma`)

## Step-by-Step Setup

### 1. Apply Database Migration

Option A: Using Prisma (if you have Prisma configured for your Supabase database):

```bash
# Ensure your DATABASE_URL in .env points to your Supabase database
npx prisma migrate deploy

# Or generate and apply migration manually:
npx prisma migrate dev --name add_system_admin_support
```

Option B: Direct SQL (via Supabase Dashboard):

1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy the SQL from `prisma/migrations/01_add_system_admin_support.sql`
4. Execute

**Key SQL changes:**

```sql
-- Make agencyId nullable
ALTER TABLE "user" ALTER COLUMN "agencyId" DROP NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "user_role_idx" ON "user"("role");
CREATE INDEX IF NOT EXISTS "agency_registrationStatus_idx" ON "agency"("registrationStatus");

-- Create initial System Admin
INSERT INTO "user"
  (email, "passwordHash", name, phone, role, "agencyId", active, "dutyStatus", "createdAt")
VALUES (
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
```

### 2. Update UserRole Enum in PostgreSQL

If the `SYSTEM_ADMIN` value is not already in your `UserRole` enum:

```sql
-- In PostgreSQL, enums cannot be modified. You must:
-- 1. Create a new type with all values
-- 2. Update columns to use the new type
-- 3. Drop the old type

CREATE TYPE "UserRole_new" AS ENUM ('SYSTEM_ADMIN', 'AGENCY_ADMIN', 'COMMAND_STAFF', 'FIELD_RESPONDER');
ALTER TABLE "user" ALTER COLUMN "role" TYPE "UserRole_new" USING "role"::text::"UserRole_new";
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
```

Or use `ALTER TYPE ... ADD VALUE`:

```sql
ALTER TYPE "UserRole" ADD VALUE 'SYSTEM_ADMIN' BEFORE 'AGENCY_ADMIN';
```

### 3. Verify Initial System Admin

Query your database to verify:

```sql
SELECT id, email, name, role, "agencyId", active
FROM "user"
WHERE role = 'SYSTEM_ADMIN';
```

Expected result:
```
 id | email                | name                   | role          | agencyId | active
----|----------------------|------------------------|---------------|----------|--------
  1 | admin@rescueeye.io   | System Administrator   | SYSTEM_ADMIN   | NULL     | true
```

### 4. Run Prisma Generate (Optional)

If you're using Prisma Client in your backend:

```bash
npx prisma generate
```

This updates the generated Prisma Client types to match your schema.

## Development: Using Mock Users

For local development, the application uses **mock users** from `src/data/mockUsers.ts`:

- System Admin: `admin@rescueeye.io` / `password123` (no agency)
- Agency Admin: `agencyadmin@rescueeye.io` / `password123` (agency-1)
- Field Responders: `responder@rescueeye.io` / `password123`
- etc.

These mock users are loaded into the `UserStore` context for authentication.

**The mock users take precedence over database users in development.**

To switch to database-only authentication, you would need to update `AuthContext.tsx` to query the database instead of UserStore. This is intentionally NOT done yet because it requires:

1. Supabase Auth integration (RLS policies, Auth users, etc.)
2. Password hashing/comparison in Supabase
3. Session management via Supabase Auth tokens

## New Database Hooks

### useUserDatabase.ts

Functions for querying users from Supabase:

```typescript
const { getUsers, getSystemAdmins, getAgencyAdmins, authenticateUser, createUser, ... } = useUserDatabase()

// Get all System Admins
const systemAdmins = await getSystemAdmins()

// Get Agency Admins for an agency
const agencyAdmins = await getAgencyAdmins(agencyId)

// Authenticate a user (email + passwordHash)
const user = await authenticateUser('admin@rescueeye.io', hashedPassword)
```

### useAgencyDatabase.ts (Updated)

Functions for agency management:

```typescript
const { getAgencies, getPendingAgencies, approveAgency, rejectAgency, ... } = useAgencyDatabase()

// Get pending agencies for System Admin review
const pending = await getPendingAgencies()

// Approve an agency (System Admin action)
await approveAgency(agencyId, systemAdminUserId)

// Reject an agency
await rejectAgency(agencyId, systemAdminUserId)
```

## User Creation Flow

### System Admin (Manual - one-time setup)

```sql
-- Created by migration script or manual SQL
INSERT INTO "user" (email, passwordHash, name, role, agencyId, active)
VALUES ('admin@rescueeye.io', '<hash>', 'System Administrator', 'SYSTEM_ADMIN', NULL, true);
```

### Agency Admin (via Agency Registration)

1. User fills out agency registration form
2. `createAgency()` hook creates:
   - A `user` record with role='AGENCY_ADMIN', agencyId=NULL, active=false
   - An `agency` record with registrationStatus='PENDING'
   - Updates the user with the new agencyId
3. System Admin reviews and approves
4. `approveAgency()` sets user.active=true

### Command Staff / Field Responder (via Agency Admin)

1. Agency Admin creates user in user management
2. `createUser()` creates user with appropriate role and agencyId
3. User becomes active immediately (or after approval)

## RLS Policies (Recommended)

While the schema is now correct, you should configure **Row Level Security (RLS)** policies in Supabase to:

- Prevent users from seeing other agencies' data
- Restrict System Admin operations to System Admin users only
- Restrict Agency Admin operations to their own agency

Example policy structure:

```sql
-- Users can see their own agency's users and agencies
CREATE POLICY "see_own_agency" ON "user"
  USING (auth.uid() IS NULL OR "agencyId" = (
    SELECT "agencyId" FROM "user" WHERE id = current_user_id()
  ) OR role = 'SYSTEM_ADMIN');

-- Only System Admins can approve/reject agencies
CREATE POLICY "system_admin_only" ON "agency"
  USING (auth.uid() IS NULL OR (
    SELECT role FROM "user" WHERE id = current_user_id()
  ) = 'SYSTEM_ADMIN');
```

Currently, RLS is NOT enforced in development (using anon key). In production, implement proper RLS and use authenticated users.

## Troubleshooting

### Issue: "Cannot insert null value into agencyId"

**Solution:** The migration didn't apply. Make sure you ran the ALTER TABLE command to make agencyId nullable.

### Issue: System Admin can't see pending agencies

**Solution:** Ensure the query is using `.filter()` for registrationStatus='PENDING', not relying on RLS (which is not yet configured).

### Issue: "SYSTEM_ADMIN not a valid enum value"

**Solution:** The enum wasn't updated. Run the SQL to add SYSTEM_ADMIN to the UserRole enum.

### Issue: Creating Agency Admin fails with "agencyId cannot be null"

**Solution:** The old agencyId NOT NULL constraint is still active. Run the ALTER TABLE ... DROP NOT NULL command.

## Next Steps

1. ✅ Update Prisma schema
2. ✅ Create database migration
3. ✅ Create database hooks
4. ✅ Update authentication types
5. ⏭️ Apply migration to Supabase database
6. ⏭️ Test System Admin login and agency approval workflow
7. ⏭️ (Future) Implement RLS policies for production
8. ⏭️ (Future) Migrate from mock users to Supabase Auth

## References

- Prisma Schema: `prisma/schema.prisma`
- Migration: `prisma/migrations/01_add_system_admin_support.sql`
- Seed script: `prisma/seed.ts`
- User types: `src/types/user.ts`
- Database hooks: `src/hooks/useUserDatabase.ts`, `src/hooks/useAgencyDatabase.ts`
- Mock users: `src/data/mockUsers.ts` (for development)
