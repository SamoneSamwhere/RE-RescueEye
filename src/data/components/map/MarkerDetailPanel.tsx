import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MapPinned, ArrowRight } from 'lucide-react'
import { Panel, EmptyState, PriorityBadge, DetectionStatusBadge, MissionStatusBadge, Badge } from '../ui'
import { formatDateTime } from '../../../lib/formatDateTime'
import { DETECTION_CATEGORY_LABEL, DAMAGE_CLASSIFICATION_LABEL } from '../../../lib/labels'
import { commandStaffIncidentDetailPath } from '../../../routes/paths'
import type { MapMarker } from './types'

interface DetailRowProps {
  label: string
  children: ReactNode
}

function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">{label}</span>
      <span className="text-sm text-foreground">{children}</span>
    </div>
  )
}

interface MarkerDetailPanelProps {
  marker: MapMarker | null
  /** Command Staff can jump to the full incident record; Field Responders have no route for it, so hide the link there. */
  showIncidentLink?: boolean
}

export function MarkerDetailPanel({ marker, showIncidentLink = true }: MarkerDetailPanelProps) {
  if (!marker) {
    return (
      <Panel title="Marker Details">
        <EmptyState icon={MapPinned} title="No marker selected" description="Select a marker on the map to view its details." />
      </Panel>
    )
  }

  if (marker.kind === 'INCIDENT') {
    const detectionTypeLabel = marker.damageClassification
      ? `${DETECTION_CATEGORY_LABEL[marker.detectionCategory]} — ${DAMAGE_CLASSIFICATION_LABEL[marker.damageClassification]}`
      : DETECTION_CATEGORY_LABEL[marker.detectionCategory]

    return (
      <Panel title="Confirmed Incident">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <PriorityBadge priority={marker.priority} />
            <Badge tone="info">{marker.status}</Badge>
          </div>
          <DetailRow label="Detection Type">{detectionTypeLabel}</DetailRow>
          <DetailRow label="Location">
            {marker.location.lat.toFixed(4)}, {marker.location.lng.toFixed(4)}
          </DetailRow>
          <DetailRow label="Verified">{formatDateTime(marker.verifiedAt)}</DetailRow>
          {showIncidentLink ? (
            <Link
              to={commandStaffIncidentDetailPath(marker.incidentId)}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-md border border-accent bg-accent px-3 py-2 text-sm font-medium text-foreground-inverse hover:bg-accent-hover"
            >
              View Incident Details
              <ArrowRight className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </Panel>
    )
  }

  if (marker.kind === 'DETECTION') {
    const detectionTypeLabel = marker.damageClassification
      ? `${DETECTION_CATEGORY_LABEL[marker.category]} — ${DAMAGE_CLASSIFICATION_LABEL[marker.damageClassification]}`
      : DETECTION_CATEGORY_LABEL[marker.category]

    return (
      <Panel title="AI Detection">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{detectionTypeLabel}</span>
            <DetectionStatusBadge status={marker.validationStatus} />
          </div>
          <DetailRow label="Confidence">{Math.round(marker.confidence * 100)}%</DetailRow>
          <DetailRow label="Location">
            {marker.location.lat.toFixed(4)}, {marker.location.lng.toFixed(4)}
          </DetailRow>
          <DetailRow label="Detected">{formatDateTime(marker.detectedAt)}</DetailRow>
          {marker.validationStatus === 'PENDING' ? (
            <p className="text-xs text-foreground-muted">
              Not yet reviewed — review in Detection Review to confirm or reject.
            </p>
          ) : null}
        </div>
      </Panel>
    )
  }

  return (
    <Panel title="Field Responder">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{marker.name}</span>
          <Badge tone={marker.accountStatus === 'ACTIVE' ? 'success' : 'neutral'}>
            {marker.accountStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <DetailRow label="Location">
          {marker.location.lat.toFixed(4)}, {marker.location.lng.toFixed(4)}
        </DetailRow>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
            Mission Status
          </span>
          {marker.missionStatus ? (
            <MissionStatusBadge status={marker.missionStatus} />
          ) : (
            <Badge tone="neutral">Available</Badge>
          )}
        </div>
        {marker.missionIncidentPriority ? (
          <DetailRow label="Incident Priority">
            <PriorityBadge priority={marker.missionIncidentPriority} />
          </DetailRow>
        ) : null}
      </div>
    </Panel>
  )
}
