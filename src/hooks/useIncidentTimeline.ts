import { useMemo } from 'react'
import { buildIncidentEvents } from '../lib/incidentEvents'
import type { IncidentTimelineEvent } from '../components/incidents'
import type { Detection } from '../types/detection'
import type { Incident } from '../types/incident'
import type { Mission } from '../types/mission'

/**
 * The short, chronological event list on an incident's detail page. The full
 * cross-incident feed, with every responder update, lives on the Logs page
 * (see useActivityLog).
 */
export function useIncidentTimeline(
  incident: Incident | null,
  detection: Detection | null,
  missions: Mission[],
  sourceLabel: string,
): IncidentTimelineEvent[] {
  return useMemo(() => {
    if (!incident || !detection) return []
    return buildIncidentEvents(detection, incident, missions, sourceLabel, false)
  }, [incident, detection, missions, sourceLabel])
}
