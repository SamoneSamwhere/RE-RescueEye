import { Search } from 'lucide-react'
import { Card, Input } from '../ui'
import { INCIDENT_STATUS_LABEL, DETECTION_CATEGORY_LABEL } from '../../../lib/labels'
import type { IncidentPriority, IncidentStatus } from '../../types/incident'
import type { DetectionCategory } from '../../types/detection'

export type PriorityFilter = IncidentPriority | 'ALL'
export type StatusFilterValue = IncidentStatus | 'ALL'
export type TypeFilter = DetectionCategory | 'ALL'

interface IncidentFiltersBarProps {
  search: string
  onSearchChange: (value: string) => void
  priorityFilter: PriorityFilter
  onPriorityFilterChange: (value: PriorityFilter) => void
  statusFilter: StatusFilterValue
  onStatusFilterChange: (value: StatusFilterValue) => void
  typeFilter: TypeFilter
  onTypeFilterChange: (value: TypeFilter) => void
}

const PRIORITIES: IncidentPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const STATUSES: IncidentStatus[] = ['OPEN', 'DISPATCHED', 'IN_PROGRESS', 'CLOSED']
const TYPES: DetectionCategory[] = ['CASUALTY', 'DAMAGE']

const selectClasses =
  'h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'
const labelClasses = 'mb-1 block text-xs font-medium uppercase tracking-wide text-foreground-secondary'

export function IncidentFiltersBar({
  search,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
}: IncidentFiltersBarProps) {
  return (
    <Card className="flex flex-wrap items-end gap-3 px-4 py-3">
      <div className="min-w-[220px] flex-1">
        <label htmlFor="incident-search" className={labelClasses}>
          Search
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-foreground-muted" />
          <Input
            id="incident-search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by incident ID, type, or location"
            className="pl-8"
          />
        </div>
      </div>

      <div>
        <label htmlFor="priority-filter" className={labelClasses}>
          Priority
        </label>
        <select
          id="priority-filter"
          value={priorityFilter}
          onChange={(event) => onPriorityFilterChange(event.target.value as PriorityFilter)}
          className={selectClasses}
        >
          <option value="ALL">All Priorities</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="status-filter" className={labelClasses}>
          Status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as StatusFilterValue)}
          className={selectClasses}
        >
          <option value="ALL">All Statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {INCIDENT_STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="type-filter" className={labelClasses}>
          Incident Type
        </label>
        <select
          id="type-filter"
          value={typeFilter}
          onChange={(event) => onTypeFilterChange(event.target.value as TypeFilter)}
          className={selectClasses}
        >
          <option value="ALL">All Types</option>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {DETECTION_CATEGORY_LABEL[type]}
            </option>
          ))}
        </select>
      </div>
    </Card>
  )
}
