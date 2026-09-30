/** A response team a Field Responder can belong to — grouping only, mirrors the real Team entity from useTeamDatabase. */
export interface MockTeam {
  id: string
  agencyId: string
  name: string
  leaderUserId?: string
}

/**
 * Mock team rosters for the demo agency, so dispatch candidates have
 * something to group by even when the real (Supabase-backed) Team table
 * has not been set up for this login. See useTeamDatabase for the real
 * equivalent used by Agency Admin.
 */
export const mockTeams: MockTeam[] = [
  { id: 'team-alpha', agencyId: 'agency-1', name: 'Alpha Team', leaderUserId: 'usr-field-responder-1' },
  { id: 'team-bravo', agencyId: 'agency-1', name: 'Bravo Team', leaderUserId: 'usr-field-responder-4' },
]
