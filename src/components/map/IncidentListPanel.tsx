import { ShieldAlert } from 'lucide-react'
import { Panel, EmptyState, PriorityBadge } from '../ui'
import { cn } from '../../lib/cn'
import { formatDateTime } from '../../lib/formatDateTime'
import { DETECTION_CATEGORY_LABEL, DAMAGE_CLASSIFICATION_LABEL, INCIDENT_STATUS_LABEL } from '../../lib/labels'
import type { IncidentMapMarker } from './types'
import type { IncidentPriority } from '../../types/incident'

const PRIORITY_RANK: Record<IncidentPriority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

interface IncidentListPanelProps {
  incidents: IncidentMapMarker[]
  selectedId: string | null
  onSelect: (marker: IncidentMapMarker) => void
  /** Total before filtering, so an empty list can say whether filters are the reason. */
  totalIncidents: number
}

/**
 * The incidents on the map as a list, most urgent first. Dots are hard to find
 * and compare on a map; a list lets you read the situation top to bottom and
 * jump to any incident (the map moves to it).
 */
export function IncidentListPanel({ incidents, selectedId, onSelect, totalIncidents }: IncidentListPanelProps) {
  const sorted = [...incidents].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.verifiedAt.localeCompare(a.verifiedAt),
  )

  return (
    <Panel title={`Incidents (${incidents.length}${incidents.length !== totalIncidents ? ` of ${totalIncidents}` : ''})`} className="min-h-0 flex-1">
      {sorted.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title={totalIncidents === 0 ? 'No confirmed incidents yet' : 'No incidents match these filters'}
          description={totalIncidents === 0 ? undefined : 'Clear a filter, or pick Incidents in the bar above the map.'}
        />
      ) : (
        <ul className="-mx-4 -my-3 flex max-h-full flex-col divide-y divide-border overflow-y-auto">
          {sorted.map((incident) => {
            const type = incident.damageClassification
              ? `${DETECTION_CATEGORY_LABEL[incident.detectionCategory]} — ${DAMAGE_CLASSIFICATION_LABEL[incident.damageClassification]}`
              : DETECTION_CATEGORY_LABEL[incident.detectionCategory]
            const selected = incident.id === selectedId
            return (
              <li key={incident.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(incident)}
                  className={cn(
                    'flex w-full flex-col gap-1 px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus',
                    selected ? 'bg-accent-subtle' : 'hover:bg-surface-secondary',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{type}</span>
                    <PriorityBadge priority={incident.priority} />
                  </div>
                  <span className="text-xs text-foreground-secondary">
                    {INCIDENT_STATUS_LABEL[incident.status] ?? incident.status} · {formatDateTime(incident.verifiedAt)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
