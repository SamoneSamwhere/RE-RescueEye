import { ACTIVE_MISSION_STATUSES } from './missionStatus'
import type { Mission } from '../types/mission'

/**
 * ACTIVE — at least one member is still working the incident.
 * COMPLETED — nobody is still working it and at least one member finished.
 * NEEDS_RESPONDERS — everyone dispatched declined; Command Staff must add more.
 */
export type ResponseTeamStatus = 'ACTIVE' | 'COMPLETED' | 'NEEDS_RESPONDERS'

/**
 * A response team: the Field Responders Command Staff selected and alerted for
 * one incident. Nobody creates or edits a team by hand — dispatching forms it,
 * and responders dispatched to the same incident later join it. So it is
 * derived from that incident's missions here rather than stored separately,
 * which keeps it from ever disagreeing with who was actually dispatched.
 * Agency Admins only monitor teams.
 */
export interface ResponseTeam {
  /** One team per incident, so the incident id identifies it. */
  id: string
  incidentId: string
  formedAt: string
  formedByUserId: string
  /** Responders who did not decline, in dispatch order. */
  members: Mission[]
  /** Responders who were alerted but declined — kept for the record, not part of the team. */
  declined: Mission[]
  status: ResponseTeamStatus
}

export const RESPONSE_TEAM_STATUS_LABEL: Record<ResponseTeamStatus, string> = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  NEEDS_RESPONDERS: 'Needs responders',
}

function teamStatus(members: Mission[]): ResponseTeamStatus {
  if (members.some((m) => ACTIVE_MISSION_STATUSES.has(m.status))) return 'ACTIVE'
  if (members.some((m) => m.status === 'COMPLETED')) return 'COMPLETED'
  return 'NEEDS_RESPONDERS'
}

/** Groups missions into one response team per incident, most recently formed first. */
export function buildResponseTeams(missions: Mission[]): ResponseTeam[] {
  const byIncident = new Map<string, Mission[]>()
  for (const mission of missions) {
    const group = byIncident.get(mission.incidentId)
    if (group) group.push(mission)
    else byIncident.set(mission.incidentId, [mission])
  }

  return [...byIncident.entries()]
    .map(([incidentId, group]): ResponseTeam => {
      const ordered = [...group].sort((a, b) => a.dispatchedAt.localeCompare(b.dispatchedAt))
      const members = ordered.filter((m) => m.status !== 'DECLINED')
      return {
        id: incidentId,
        incidentId,
        formedAt: ordered[0].dispatchedAt,
        formedByUserId: ordered[0].dispatchedByUserId,
        members,
        declined: ordered.filter((m) => m.status === 'DECLINED'),
        status: teamStatus(members),
      }
    })
    .sort((a, b) => b.formedAt.localeCompare(a.formedAt))
}

/** The response team working one incident, or null if nobody has been dispatched to it. */
export function responseTeamFor(missions: Mission[], incidentId: string): ResponseTeam | null {
  return buildResponseTeams(missions.filter((m) => m.incidentId === incidentId))[0] ?? null
}
