import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Download, ScrollText, Search, X } from 'lucide-react'
import { EmptyState, Badge, Button } from '../ui'
import { cn } from '../../../lib/cn'
import { ACTIVITY_KIND_LABEL } from '../../../lib/incidentEvents'
import { commandStaffIncidentDetailPath } from '../../../routes/paths'
import type { ActivityEvent, ActivityKind } from '../../../lib/incidentEvents'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const KINDS = Object.keys(ACTIVITY_KIND_LABEL) as ActivityKind[]
const KIND_TONE: Record<ActivityKind, Tone> = {
  DETECTED: 'info',
  CONFIRMED: 'success',
  REJECTED: 'danger',
  NOTIFIED: 'warning',
  RESPONDER_UPDATE: 'neutral',
  CLOSED: 'neutral',
}
const KIND_SHORT: Record<ActivityKind, string> = {
  DETECTED: 'Detected',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  NOTIFIED: 'Notified',
  RESPONDER_UPDATE: 'Update',
  CLOSED: 'Closed',
}
const PAGE_SIZES = [25, 50, 100]

const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

const fieldClass =
  'h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'

const dayKey = (iso: string) => dayFormatter.format(new Date(iso))

function toCsv(events: ActivityEvent[]): string {
  const cell = (value: string | undefined) => `"${(value ?? '').replace(/"/g, '""')}"`
  const rows = events.map((e) =>
    [e.timestamp, ACTIVITY_KIND_LABEL[e.kind], e.actor, e.incidentId, e.label, e.detail].map(cell).join(','),
  )
  return ['Timestamp,Event,Actor,Incident,Description,Details', ...rows].join('\n')
}

interface ActivityLogFeedProps {
  events: ActivityEvent[]
  selectedId?: string | null
  /** Called when a row is clicked — the page opens that event's detection in a drawer. */
  onSelect: (event: ActivityEvent) => void
}

/**
 * Cross-incident audit log, laid out like a conventional log viewer: a dense
 * table (time, event, description, actor, incident) under a toolbar of search,
 * event-type chips and a date range, with day separators, sorting, paging and
 * CSV export. Each incident's own page keeps a short version of its slice.
 */
export function ActivityLogFeed({ events, selectedId, onSelect }: ActivityLogFeedProps) {
  const [query, setQuery] = useState('')
  const [kinds, setKinds] = useState<ActivityKind[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [newestFirst, setNewestFirst] = useState(true)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [page, setPage] = useState(0)

  const counts = useMemo(() => {
    const result = {} as Record<ActivityKind, number>
    for (const kind of KINDS) result[kind] = 0
    for (const event of events) result[event.kind] += 1
    return result
  }, [events])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matches = events.filter((event) => {
      if (kinds.length > 0 && !kinds.includes(event.kind)) return false
      const day = event.timestamp.slice(0, 10)
      if (from && day < from) return false
      if (to && day > to) return false
      if (needle) {
        const haystack = `${event.label} ${event.detail ?? ''} ${event.actor} ${event.incidentId ?? ''}`.toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })
    return matches.sort((a, b) =>
      newestFirst ? b.timestamp.localeCompare(a.timestamp) : a.timestamp.localeCompare(b.timestamp),
    )
  }, [events, query, kinds, from, to, newestFirst])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const start = currentPage * pageSize
  const visible = filtered.slice(start, start + pageSize)
  const hasFilters = query !== '' || kinds.length > 0 || from !== '' || to !== ''

  // Any change to what is shown returns to the first page.
  function update(apply: () => void) {
    apply()
    setPage(0)
  }

  function toggleKind(kind: ActivityKind) {
    update(() => setKinds((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind])))
  }

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-foreground-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => update(() => setQuery(e.target.value))}
              placeholder="Search events, people, incidents…"
              aria-label="Search the activity log"
              className={cn(fieldClass, 'w-full pl-8 placeholder:text-foreground-muted')}
            />
          </div>
          <label className="flex items-center gap-1.5 text-sm text-foreground-secondary">
            From
            <input
              type="date"
              className={fieldClass}
              value={from}
              max={to || undefined}
              onChange={(e) => update(() => setFrom(e.target.value))}
            />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-foreground-secondary">
            To
            <input
              type="date"
              className={fieldClass}
              value={to}
              min={from || undefined}
              onChange={(e) => update(() => setTo(e.target.value))}
            />
          </label>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {KINDS.map((kind) => {
            const active = kinds.includes(kind)
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={active}
                onClick={() => toggleKind(kind)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                  active
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-border bg-surface-secondary text-foreground-secondary hover:border-border-strong hover:text-foreground',
                )}
              >
                {ACTIVITY_KIND_LABEL[kind]} <span className="tabular-nums opacity-70">{counts[kind]}</span>
              </button>
            )
          })}
          {hasFilters ? (
            <button
              type="button"
              onClick={() =>
                update(() => {
                  setQuery('')
                  setKinds([])
                  setFrom('')
                  setTo('')
                })
              }
              className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              <X className="size-3" />
              Clear all
            </button>
          ) : null}
        </div>
      </div>

      {/* Log table */}
      {filtered.length === 0 ? (
        <EmptyState icon={ScrollText} title="No log entries match" description="Try removing a filter or widening the date range." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
              <thead className="bg-surface-secondary text-xs uppercase tracking-wide text-foreground-secondary">
                <tr>
                  <th scope="col" className="w-36 px-4 py-2 font-semibold">
                    <button
                      type="button"
                      onClick={() => update(() => setNewestFirst((v) => !v))}
                      className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                      aria-label={`Sort by time, currently ${newestFirst ? 'newest' : 'oldest'} first`}
                    >
                      Time
                      {newestFirst ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />}
                    </button>
                  </th>
                  <th scope="col" className="w-28 px-2 py-2 font-semibold">
                    Event
                  </th>
                  <th scope="col" className="px-2 py-2 font-semibold">
                    Description
                  </th>
                  <th scope="col" className="w-40 px-2 py-2 font-semibold">
                    Actor
                  </th>
                  <th scope="col" className="w-44 px-4 py-2 font-semibold">
                    Incident
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((event, index) => (
                  <LogRows
                    key={event.id}
                    event={event}
                    selected={event.id === selectedId}
                    onSelect={onSelect}
                    dayHeading={
                      index === 0 || dayKey(event.timestamp) !== dayKey(visible[index - 1].timestamp)
                        ? dayKey(event.timestamp)
                        : null
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2 text-sm text-foreground-secondary">
            <span className="tabular-nums">
              {start + 1}–{Math.min(start + pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5">
                Rows
                <select
                  className={cn(fieldClass, 'h-8')}
                  value={pageSize}
                  onChange={(e) => update(() => setPageSize(Number(e.target.value)))}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LogRows({
  event,
  dayHeading,
  selected,
  onSelect,
}: {
  event: ActivityEvent
  dayHeading: string | null
  selected: boolean
  onSelect: (event: ActivityEvent) => void
}) {
  return (
    <>
      {dayHeading ? (
        <tr className="bg-surface-secondary/60">
          <td colSpan={5} className="border-t border-border px-4 py-1.5 text-xs font-semibold text-foreground-secondary">
            {dayHeading}
          </td>
        </tr>
      ) : null}
      <tr
        tabIndex={0}
        aria-selected={selected}
        onClick={() => onSelect(event)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(event)
          }
        }}
        className={cn(
          'cursor-pointer border-t border-border align-top transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus',
          selected ? 'bg-accent-subtle' : 'hover:bg-surface-secondary/50',
        )}
      >
        <td className="whitespace-nowrap px-4 py-2 font-mono text-xs tabular-nums text-foreground-secondary">
          {timeFormatter.format(new Date(event.timestamp))}
        </td>
        <td className="px-2 py-2">
          <Badge tone={KIND_TONE[event.kind]}>{KIND_SHORT[event.kind]}</Badge>
        </td>
        <td className="px-2 py-2">
          <p className="text-foreground">{event.label}</p>
          {event.detail ? <p className="text-xs text-foreground-secondary">{event.detail}</p> : null}
        </td>
        <td className="px-2 py-2 text-foreground-secondary">{event.actor}</td>
        <td className="px-4 py-2">
          {event.incidentId ? (
            <Link
              to={commandStaffIncidentDetailPath(event.incidentId)}
              onClick={(e) => e.stopPropagation()}
              className="block max-w-40 truncate font-mono text-xs text-accent hover:underline"
              title={event.incidentId}
            >
              {event.incidentId}
            </Link>
          ) : (
            <span className="text-xs text-foreground-muted">—</span>
          )}
        </td>
      </tr>
    </>
  )
}
