import { FilterX } from 'lucide-react'
import { Button } from '../ui'
import { EMPTY_MEDIA_FILTERS, hasActiveFilters } from './mediaFilters'
import type { MediaFilters } from './mediaFilters'

interface Option {
  value: string
  label: string
}

interface MediaFilterBarProps {
  filters: MediaFilters
  onChange: (next: MediaFilters) => void
  droneOptions: Option[]
  missionOptions: Option[]
  shown: number
  total: number
}

function Select({
  label,
  value,
  onChange,
  options,
  emptyLabel,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Option[]
  emptyLabel: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground-secondary">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={options.length === 0}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground disabled:opacity-60"
      >
        <option value="">{options.length === 0 ? emptyLabel : 'All'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * Filters for the stored media library.
 *
 * Dates are two bounds rather than a preset list ("last 7 days") because the
 * useful question after an operation is "what did we capture between these
 * two points", and a single date is expressible by setting both to it.
 */
export function MediaFilterBar({
  filters,
  onChange,
  droneOptions,
  missionOptions,
  shown,
  total,
}: MediaFilterBarProps) {
  const set = (patch: Partial<MediaFilters>) => onChange({ ...filters, ...patch })

  return (
    <div className="mb-3 flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface-secondary px-3 py-2">
      <Select
        label="Drone"
        value={filters.droneId}
        onChange={(droneId) => set({ droneId })}
        options={droneOptions}
        emptyLabel="No drones"
      />
      <Select
        label="Mission"
        value={filters.missionId}
        onChange={(missionId) => set({ missionId })}
        options={missionOptions}
        emptyLabel="No linked missions"
      />
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground-secondary">From</span>
        <input
          type="date"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(e) => set({ from: e.target.value })}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground-secondary">To</span>
        <input
          type="date"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(e) => set({ to: e.target.value })}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
        />
      </label>

      <span className="ml-auto flex items-center gap-3 text-xs text-foreground-secondary">
        Showing {shown} of {total}
        {hasActiveFilters(filters) ? (
          <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_MEDIA_FILTERS)}>
            <FilterX className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </span>
    </div>
  )
}
