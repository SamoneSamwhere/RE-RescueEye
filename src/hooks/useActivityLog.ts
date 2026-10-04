import { useMemo } from 'react'
import { mockDrones } from '../data/mockDrones'
import { buildIncidentEvents } from '../lib/incidentEvents'
import { sourceLabelFor } from '../lib/sourceLabel'
import type { ActivityEvent } from '../lib/incidentEvents'
import type { Detection } from '../types/detection'
import type { Incident } from '../types/incident'
import type { Mission } from '../types/mission'
import type { MediaAsset } from '../types/media'

/** Every event across every detection and incident, newest first. */
export function useActivityLog(
  detections: Detection[],
  incidents: Incident[],
  missions: Mission[],
  mediaAssets: MediaAsset[],
): ActivityEvent[] {
  return useMemo(() => {
    const incidentByDetection = new Map(incidents.map((incident) => [incident.detectionId, incident]))
    return detections
      .flatMap((detection) =>
        buildIncidentEvents(
          detection,
          incidentByDetection.get(detection.id) ?? null,
          missions,
          sourceLabelFor(detection.mediaAssetId, mediaAssets, mockDrones),
          true,
        ),
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }, [detections, incidents, missions, mediaAssets])
}
