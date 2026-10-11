import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getIncidentsByIds } from '../db/incidents'
import type { IncidentRow } from '../db/incidents'
import { detectionCategoryFor, isDbId } from '../lib/incidentClassification'
import { useIncidentStore } from '../state/IncidentStore'
import { useDetectionStore } from '../state/DetectionStore'
import type { Incident, IncidentStatus } from '../types/incident'
import type { Detection } from '../types/detection'
import type { Mission } from '../types/mission'

const STATUS_FROM_DB: Record<IncidentRow['status'], IncidentStatus> = {
  OPEN: 'OPEN',
  ASSIGNED: 'DISPATCHED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'CLOSED',
}

/** The database stores UTC without a zone marker. */
const utc = (value: string) => (/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`)

/**
 * Missions arrive over the live socket on every device, but incidents and
 * detections live in each browser's memory - so a responder's phone receives a
 * mission whose incident it has never seen. Incidents verified by a real
 * account are rows in the database; this loads any such incident a mission
 * points at and adds it (with the detection fields the mission screens read:
 * category and location) to the local stores.
 */
export function useDbIncidentHydration(missions: Mission[]) {
  const { incidents, addIncident } = useIncidentStore()
  const { detections, addDetection } = useDetectionStore()

  const missingIds = useMemo(() => {
    const known = new Set(incidents.map((i) => i.id))
    return [...new Set(missions.map((m) => m.incidentId))].filter((id) => isDbId(id) && !known.has(id)).sort()
  }, [missions, incidents])

  const { data: rows } = useQuery({
    queryKey: ['dbIncidents', missingIds],
    queryFn: () => getIncidentsByIds(missingIds.map(Number)),
    enabled: missingIds.length > 0,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (!rows) return
    const knownIncidents = new Set(incidents.map((i) => i.id))
    const knownDetections = new Set(detections.map((d) => d.id))
    for (const row of rows) {
      const incidentId = String(row.id)
      if (knownIncidents.has(incidentId)) continue
      const detectionId = `db-incident-${row.id}`
      if (!knownDetections.has(detectionId)) {
        const detection: Detection = {
          id: detectionId,
          mediaAssetId: '',
          category: detectionCategoryFor(row.incidentType),
          damageClassification: row.incidentType === 'STRUCTURAL' ? 'STRUCTURAL' : undefined,
          confidence: 1,
          boundingBox: { x: 0, y: 0, width: 0, height: 0 },
          location: { lat: row.lat, lng: row.lng },
          detectedAt: utc(row.createdAt),
          validationStatus: 'VERIFIED',
          reviewedByUserId: String(row.reportedBy),
          reviewedAt: utc(row.createdAt),
          reviewerNotes: row.description ?? undefined,
        }
        addDetection(detection)
      }
      const incident: Incident = {
        id: incidentId,
        detectionId,
        agencyId: String(row.agencyId),
        priority: row.severity,
        status: STATUS_FROM_DB[row.status],
        verifiedByUserId: String(row.reportedBy),
        verifiedAt: utc(row.createdAt),
      }
      addIncident(incident)
    }
    // Only new rows should trigger this; the stores changing because of it must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])
}
