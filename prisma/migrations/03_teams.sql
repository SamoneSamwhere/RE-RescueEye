-- Teams: grouping an organization's personnel into response teams.
--
-- Run this in the Supabase SQL editor. Until it is run, the Teams page says so
-- and personnel management keeps working without a Team column.
--
-- Who manages teams: the Agency Admin — the same role that creates, activates
-- and deactivates the organization's personnel accounts. Command Staff see
-- teams when dispatching but do not change membership, so one person owns the
-- roster and a team cannot be reshuffled mid-operation by whoever is on shift.

CREATE TABLE IF NOT EXISTS "team" (
  "id"           SERIAL PRIMARY KEY,
  "agencyId"     INTEGER      NOT NULL REFERENCES "agency"("id") ON DELETE CASCADE,
  "name"         VARCHAR(60)  NOT NULL,
  -- The member who leads the team. Cleared, not cascaded, if that account goes.
  "leaderUserId" INTEGER      NULL REFERENCES "user"("id") ON DELETE SET NULL,
  "createdAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Two teams in one organization with the same name would be indistinguishable on a dispatch screen.
  CONSTRAINT "team_agency_name_key" UNIQUE ("agencyId", "name")
);

CREATE INDEX IF NOT EXISTS "team_agencyId_idx" ON "team"("agencyId");

-- One team per person: a responder is dispatched as part of one team.
-- Deleting a team leaves its members unassigned rather than deleting them.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "teamId" INTEGER NULL
  REFERENCES "team"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "user_teamId_idx" ON "user"("teamId");
