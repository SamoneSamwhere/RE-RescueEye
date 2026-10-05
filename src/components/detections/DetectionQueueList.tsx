import { useState } from 'react'
import { ChevronLeft, ChevronRight, ScanSearch } from 'lucide-react'
import { Panel, Button, DetectionStatusBadge, EmptyState } from '../ui'
import { formatDateTime } from '../../../lib/formatDateTime'
import { cn } from '../../../lib/cn'
import { DETECTION_CATEGORY_LABEL } from '../../../lib/labels'
import type { DetectionValidationStatus } from '../../../types/detection'
import type { EnrichedDetection } from './types'

type StatusFilter = DetectionValidationStatus | 'ALL'

interface DetectionQueueListProps {
  detections: EnrichedDetection[]
  selectedId: string | null
  statusFilter: StatusFilter
  onSelect: (id: string) => void
  onStatusFilterChange: (filter: StatusFilter) => void
}

// Fixed page size keeps the queue a constant height, so the page never needs a scrollbar.
const PAGE_SIZE = 6

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
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(detections.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const start = currentPage * PAGE_SIZE
  const visible = detections.slice(start, start + PAGE_SIZE)

  return (
    <Panel
      title="Detection Review Queue"
      className="xl:h-full xl:min-h-0"
      actions={
        <div className="flex items-center">
          {FILTERS.map((filter) => (
            <Button
              key={filter.value}
              size="sm"
              className="px-2"
              variant={statusFilter === filter.value ? 'secondary' : 'ghost'}
              onClick={() => {
                setPage(0)
                onStatusFilterChange(filter.value)
              }}
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
        <ul className="flex flex-col divide-y divide-border">
          {visible.map((detection) => {
            const isSelected = detection.id === selectedId
            return (
              <li key={detection.id}>
                <button
                  type="button"
                  onClick={() => onSelect(detection.id)}
                  className={cn(
                    'flex w-full flex-col gap-0.5 px-2 py-2 text-left transition-colors',
                    isSelected ? 'bg-accent-subtle' : 'hover:bg-surface-secondary',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="whitespace-nowrap text-sm font-medium text-foreground">
                      {DETECTION_CATEGORY_LABEL[detection.category]} · {Math.round(detection.confidence * 100)}%
                    </span>
                    <DetectionStatusBadge status={detection.validationStatus} />
                  </div>
                  <span className="truncate text-xs text-foreground-secondary">
                    {detection.sourceLabel} · {formatDateTime(detection.detectedAt)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {detections.length > PAGE_SIZE ? (
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs text-foreground-secondary">
          <span>
            {start + 1}–{Math.min(start + PAGE_SIZE, detections.length)} of {detections.length}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" aria-label="Previous page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" aria-label="Next page" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </Panel>
  )
}
