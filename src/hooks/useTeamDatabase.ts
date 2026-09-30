import { supabase, handleDatabaseError } from '../lib/supabase'

export interface DbTeam {
  id: number
  agencyId: number
  name: string
  leaderUserId: number | null
  createdAt: string
}

export type TeamsResult = { available: true; teams: DbTeam[] } | { available: false; teams: []; error: string }

/** The table or column from migration 03_teams.sql is not there yet. */
function isMissingSchema(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42P01' || // undefined_table
    error.code === 'PGRST205' || // table not in the schema cache
    error.code === 'PGRST204' || // column not in the schema cache
    /relation .*team.* does not exist|could not find the table/i.test(error.message ?? '')
  )
}

export const TEAMS_MIGRATION_MESSAGE =
  'Teams are not set up in the database yet. Run prisma/migrations/03_teams.sql in Supabase to enable them.'

function describe(error: { code?: string; message?: string }): string {
  if (isMissingSchema(error)) return TEAMS_MIGRATION_MESSAGE
  if (error.code === '23505') return 'A team with this name already exists.'
  return handleDatabaseError(error)
}

/**
 * Team rows for one organization. Teams belong to the Agency Admin: they are
 * the only role that creates teams and moves personnel between them.
 */
export function useTeamDatabase() {
  const getTeams = async (agencyId: number): Promise<TeamsResult> => {
    const { data, error } = await supabase
      .from('team')
      .select('id, agencyId, name, leaderUserId, createdAt')
      .eq('agencyId', agencyId)
      .order('name', { ascending: true })
    if (error) {
      console.error('Get teams error:', error)
      return { available: false, teams: [], error: describe(error) }
    }
    return { available: true, teams: (data as DbTeam[]) ?? [] }
  }

  /** Returns an error message, or null on success. */
  const createTeam = async (agencyId: number, name: string): Promise<string | null> => {
    const { error } = await supabase.from('team').insert([{ agencyId, name: name.trim() }])
    return error ? describe(error) : null
  }

  /** Members are left unassigned by the foreign key, not deleted. */
  const deleteTeam = async (teamId: number): Promise<string | null> => {
    const { error } = await supabase.from('team').delete().eq('id', teamId)
    return error ? describe(error) : null
  }

  const setTeamLeader = async (teamId: number, userId: number | null): Promise<string | null> => {
    const { error } = await supabase.from('team').update({ leaderUserId: userId }).eq('id', teamId)
    return error ? describe(error) : null
  }

  return { getTeams, createTeam, deleteTeam, setTeamLeader }
}
