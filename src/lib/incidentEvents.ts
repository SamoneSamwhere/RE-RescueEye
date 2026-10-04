import { Sparkles, CheckCircle2, XCircle, Send, Archive, UserCheck, UserX, Navigation, MapPin, Flag } from 'lucide-react'
import { mockUsers } from '../data/mockUsers'
import { DAMAGE_CLASSIFICATION_LABEL, DETECTION_CATEGORY_LABEL } from './labels'
import type { IncidentTimelineEvent } from '../data/components/incidents'
import type { Detection } from '../types/detection'
import type { Incident } from '../types/incident'
import type { Mission } from '../types/mission'

export type ActivityKind = 'DETECTED' | 'CONFIRMED' | 'REJECTED' | 'NOTIFIED' | 'RESPONDER_UPDATE' | 'CLOSED'

export const ACTIVITY_KIND_LABEL: Record<ActivityKind, string> = {
  DETECTED: 'AI detections',
  CONFIRMED: 'Incident confirmed',
  REJECTED: 'Detection rejected',
  NOTIFIED: 'Responders notified',
  RESPONDER_UPDATE: 'Responder updates',
  CLOSED: 'Incident closed',
}

/** A timeline entry plus what the cross-incident log needs to filter and link it. */
export interface ActivityEvent extends IncidentTimelineEvent {
  id: string
  kind: ActivityKind
  /** Absent for detections that never became an incident (pending or rejected). */
  incidentId?: string
  detectionId: string
  /** Who did it: a person's name, or 'AI' for the detector. */
  actor: string
}

const nameOf = (userId: string | undefined, fallback: string) =>
  (userId ? mockUsers.find((u) => u.id === userId)?.name : undefined) ?? fallback

function detectedEvent(detection: Detection, sourceLabel: string): ActivityEvent {
  return {
    id: `${detection.id}-detected`,
    kind: 'DETECTED',
    detectionId: detection.id,
    actor: 'AI',
    icon: Sparkles,
    label: `${DETECTION_CATEGORY_LABEL[detection.category]} detected by AI`,
    detail: [
      detection.damageClassification ? `${DAMAGE_CLASSIFICATION_LABEL[detection.damageClassification]} damage` : null,
      `${Math.round(detection.confidence * 100)}% confidence`,
      sourceLabel,
    ]
      .filter(Boolean)
      .join(' — '),
    timestamp: detection.detectedAt,
    tone: 'ai',
  }
}

/** One responder's progress through a mission, after the initial dispatch. */
function responderUpdates(mission: Mission, incidentId: string, detectionId: string): ActivityEvent[] {
  const who = nameOf(mission.responderUserId, 'Unknown responder')
  const steps: [string | undefined, string, ActivityEvent['icon']][] = [
    [mission.acceptedAt, `${who} accepted`, UserCheck],
    [mission.declinedAt, `${who} declined`, UserX],
    [mission.enRouteAt, `${who} is en route`, Navigation],
    [mission.onSiteAt, `${who} is on site`, MapPin],
    [mission.completedAt, `${who} completed the mission`, Flag],
  ]
  return steps
    .filter((step): step is [string, string, ActivityEvent['icon']] => !!step[0])
    .map(([timestamp, label, icon]) => ({
      id: `${mission.id}-${label}`,
      kind: 'RESPONDER_UPDATE' as const,
      actor: who,
      incidentId,
      detectionId,
      icon,
      label,
      timestamp,
      tone: 'human' as const,
    }))
}

/**
 * Everything that happened to one detection / incident, oldest first.
 *
 * Responders alerted together are one entry ("Notified 4 responders") rather
 * than one per person, and mission ids are left out — they mean nothing to the
 * reader. `detailed` adds each responder's progress (accepted, en route, ...)
 * for the Logs feed; the incident page keeps the short version.
 */
export function buildIncidentEvents(
  detection: Detection,
  incident: Incident | null,
  missions: Mission[],
  sourceLabel: string,
  detailed: boolean,
): ActivityEvent[] {
  const events: ActivityEvent[] = [detectedEvent(detection, sourceLabel)]

  if (!incident) {
    if (detection.validationStatus === 'REJECTED' && detection.reviewedAt) {
      events.push({
        id: `${detection.id}-rejected`,
        kind: 'REJECTED',
        detectionId: detection.id,
        actor: nameOf(detection.reviewedByUserId, 'Unknown'),
        icon: XCircle,
        label: `Rejected by ${nameOf(detection.reviewedByUserId, 'Unknown')}`,
        detail: detection.reviewerNotes,
        timestamp: detection.reviewedAt,
        tone: 'human',
      })
    }
    return events
  }

  events.push({
    id: `${incident.id}-confirmed`,
    kind: 'CONFIRMED',
    actor: nameOf(incident.verifiedByUserId, 'Unknown'),
    incidentId: incident.id,
    detectionId: detection.id,
    icon: CheckCircle2,
    label: `Confirmed as incident by ${nameOf(incident.verifiedByUserId, 'Unknown')}`,
    detail: detection.reviewerNotes,
    timestamp: incident.verifiedAt,
    tone: 'human',
  })

  const incidentMissions = missions.filter((m) => m.incidentId === incident.id)

  // Group by dispatch minute: one "Alert" action creates a mission per responder
  // at (nearly) the same instant, and that is one event to the person reading.
  const batches = new Map<string, Mission[]>()
  for (const mission of incidentMissions) {
    const key = mission.dispatchedAt.slice(0, 16)
    batches.set(key, [...(batches.get(key) ?? []), mission])
  }
  for (const [key, batch] of batches) {
    const names = batch.map((m) => nameOf(m.responderUserId, 'Unknown responder'))
    events.push({
      id: `${incident.id}-notified-${key}`,
      kind: 'NOTIFIED',
      actor: nameOf(batch[0].dispatchedByUserId, 'Unknown'),
      incidentId: incident.id,
      detectionId: detection.id,
      icon: Send,
      label: batch.length === 1 ? `Notified ${names[0]}` : `Notified ${batch.length} responders`,
      detail: batch.length === 1 ? 'SMS notification sent' : `${names.join(', ')} — SMS notifications sent`,
      timestamp: batch.reduce((earliest, m) => (m.dispatchedAt < earliest ? m.dispatchedAt : earliest), batch[0].dispatchedAt),
      tone: 'human',
    })
  }

  if (detailed) {
    for (const mission of incidentMissions) events.push(...responderUpdates(mission, incident.id, detection.id))
  }

  if (incident.status === 'CLOSED' && incident.closedAt) {
    events.push({
      id: `${incident.id}-closed`,
      kind: 'CLOSED',
      actor: nameOf(incident.closedByUserId, 'Unknown'),
      incidentId: incident.id,
      detectionId: detection.id,
      icon: Archive,
      label: `Closed by ${nameOf(incident.closedByUserId, 'Unknown')}`,
      timestamp: incident.closedAt,
      tone: 'human',
    })
  }

  return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}
