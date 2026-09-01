import { ScanSearch } from 'lucide-react'
import { Panel, Button, DetectionStatusBadge, EmptyState } from '../ui'
import { formatDateTime } from '../../../lib/formatDateTime'
import { cn } from '../../../lib/cn'
import { DETECTION_CATEGORY_LABEL } from '../../../lib/labels'
import type { DetectionValidationStatus } from '../../types/detection'
import type { EnrichedDetection } from './types'

type StatusFilter = DetectionValidationStatus | 'ALL'

interface DetectionQueueListProps {
  detections: EnrichedDetection[]
  selectedId: string | null
  statusFilter: StatusFilter
  onSelect: (id: string) => void
  onStatusFilterChange: (filter: StatusFilter) => void
}

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
]

export function DetectionQueueList({
  detections,
  selectedId,
  statusFilter,
  onSelect,
  onStatusFilterChange,
}: DetectionQueueListProps) {
  return (
    <Panel
      title="Detection Review Queue"
      actions={
        <div className="flex items-center gap-1">
          {FILTERS.map((filter) => (
            <Button
              key={filter.value}
              size="sm"
              variant={statusFilter === filter.value ? 'secondary' : 'ghost'}
              onClick={() => onStatusFilterChange(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      }
    >
      {detections.length === 0 ? (
        <EmptyState icon={ScanSearch} title="No detections in this view" />
      ) : (
        <ul className="flex max-h-[32rem] flex-col divide-y divide-border overflow-y-auto">
          {detections.map((detection) => {
            const isSelected = detection.id === selectedId
            return (
              <li key={detection.id}>
                <button
                  type="button"
                  onClick={() => onSelect(detection.id)}
                  className={cn(
                    'flex w-full flex-col gap-1 px-1 py-2.5 text-left transition-colors',
                    isSelected ? 'bg-accent-subtle' : 'hover:bg-surface-secondary',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {DETECTION_CATEGORY_LABEL[detection.category]} · {Math.round(detection.confidence * 100)}%
                    </span>
                    <DetectionStatusBadge status={detection.validationStatus} />
                  </div>
                  <span className="text-xs text-foreground-secondary">{detection.sourceLabel}</span>
                  <span className="text-xs text-foreground-muted">{formatDateTime(detection.detectedAt)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
