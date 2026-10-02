-- Remove the Agency-Admin-managed teams added by the former 03_teams.sql.
--
-- Teams are no longer a standing roster the Agency Admin maintains. Command
-- Staff select the nearest available Field Responders for an incident and
-- alert them; the responders alerted become that incident's response team
-- automatically (see src/lib/responseTeams.ts). The Agency Admin only
-- monitors those teams. So the "team" table and "user"."teamId" have nothing
-- left to hold.
--
-- Run this in the Supabase SQL editor. Safe on a database that never ran
-- 03_teams.sql: every statement is IF EXISTS.

DROP INDEX IF EXISTS "user_teamId_idx";
ALTER TABLE "user" DROP COLUMN IF EXISTS "teamId";
DROP TABLE IF EXISTS "team";
