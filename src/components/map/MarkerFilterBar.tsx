import { FilterX } from 'lucide-react'
import { Button } from '../ui'
import { cn } from '../../lib/cn'
import { INCIDENT_PRIORITY_LABEL, INCIDENT_STATUS_LABEL } from '../../lib/labels'
import {
  EMPTY_MARKER_FILTERS,
  FILTERABLE_PRIORITIES,
  FILTERABLE_STATUSES,
  hasActiveMarkerFilters,
  toggleFilterValue,
} from './markerFilters'
import type { MarkerFilters } from './markerFilters'

interface MarkerFilterBarProps {
  filters: MarkerFilters
  onChange: (next: MarkerFilters) => void
  /** Incident markers currently on the map, and the count before filtering. */
  shown: number
  total: number
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        // min-h-8 keeps every chip a thumb-sized target on a phone.
        'min-h-8 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-accent bg-accent text-foreground-inverse'
          : 'border-border bg-surface text-foreground-secondary hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

/**
 * Status and priority filters for the Damage Map.
 *
 * Chips rather than the dropdowns the media library uses: both axes are
 * multi-select, and a native <select multiple> is close to unusable on a
 * touch screen. Every option stays visible, so a responder can see what is
 * being hidden without opening anything.
 */
export function MarkerFilterBar({ filters, onChange, shown, total }: MarkerFilterBarProps) {
  const active = hasActiveMarkerFilters(filters)

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-secondary px-3 py-2">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground-secondary">Status</span>
        <div className="flex flex-wrap gap-1.5">
          {FILTERABLE_STATUSES.map((status) => (
            <Chip
              key={status}
              label={INCIDENT_STATUS_LABEL[status]}
              active={filters.statuses.includes(status)}
              onClick={() => onChange({ ...filters, statuses: toggleFilterValue(filters.statuses, status) })}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground-secondary">Priority</span>
        <div className="flex flex-wrap gap-1.5">
          {FILTERABLE_PRIORITIES.map((priority) => (
            <Chip
              key={priority}
              label={INCIDENT_PRIORITY_LABEL[priority]}
              active={filters.priorities.includes(priority)}
              onClick={() => onChange({ ...filters, priorities: toggleFilterValue(filters.priorities, priority) })}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-foreground-secondary">
        <span>
          Showing {shown} of {total} incidents
        </span>
        {active ? (
          <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_MARKER_FILTERS)}>
            <FilterX className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  )
}
