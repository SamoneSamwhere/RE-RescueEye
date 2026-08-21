import { useMemo } from 'react'
import { Sparkles, CheckCircle2, Send, Archive } from 'lucide-react'
import { mockUsers } from '../data/mockUsers'
import { DETECTION_CATEGORY_LABEL } from '../lib/labels'
import type { IncidentTimelineEvent } from '../components/incidents'
import type { Detection } from '../types/detection'
import type { Incident } from '../types/incident'
import type { Mission } from '../types/mission'

/** Builds the chronological event list shown on an incident's detail page. */
export function useIncidentTimeline(
  incident: Incident | null,
  detection: Detection | null,
  missions: Mission[],
  sourceLabel: string,
): IncidentTimelineEvent[] {
  return useMemo(() => {
    if (!incident || !detection) return []

    const verifiedByName = mockUsers.find((u) => u.id === incident.verifiedByUserId)?.name
    const closedByName = incident.closedByUserId
      ? mockUsers.find((u) => u.id === incident.closedByUserId)?.name
      : undefined

    const events: IncidentTimelineEvent[] = [
      {
        icon: Sparkles,
        label: `${DETECTION_CATEGORY_LABEL[detection.category]} detected by AI`,
        detail: `${Math.round(detection.confidence * 100)}% confidence — ${sourceLabel}`,
        timestamp: detection.detectedAt,
        tone: 'ai',
      },
      {
        icon: CheckCircle2,
        label: `Confirmed as incident by ${verifiedByName ?? 'Unknown'}`,
        detail: detection.reviewerNotes,
        timestamp: incident.verifiedAt,
        tone: 'human',
      },
    ]

    for (const mission of missions.filter((m) => m.incidentId === incident.id)) {
      const responder = mockUsers.find((u) => u.id === mission.responderUserId)
      events.push({
        icon: Send,
        label: `Notified ${responder?.name ?? 'Unknown responder'}`,
        detail: `Mission ${mission.id} dispatched — SMS notification sent`,
        timestamp: mission.dispatchedAt,
        tone: 'human',
      })
    }

    if (incident.status === 'CLOSED' && incident.closedAt) {
      events.push({
        icon: Archive,
        label: `Closed by ${closedByName ?? 'Unknown'}`,
        timestamp: incident.closedAt,
        tone: 'human',
      })
    }

    return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }, [incident, detection, missions, sourceLabel])
}
