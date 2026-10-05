import { cn } from '../../lib/cn'

export type MetricTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/** Theme tokens, so the bars follow light and dark mode with the rest of the app. */
const FILL: Record<MetricTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-neutral',
}

export interface BreakdownSegment {
  label: string
  value: number
  tone: MetricTone
}

/**
 * One whole split into its parts — e.g. registrations by status. Segments are
 * separated by a surface gap and each keeps a labelled, counted legend entry,
 * so the split never depends on telling colors apart.
 */
export function BreakdownBar({ segments, emptyLabel = 'No data yet' }: { segments: BreakdownSegment[]; emptyLabel?: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  return (
    <div className="flex flex-col gap-2">
      {total === 0 ? (
        <div className="h-3 rounded bg-surface-secondary" aria-label={emptyLabel} />
      ) : (
        <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(', ')}>
          {segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div
                key={s.label}
                title={`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}
                className={cn('h-full first:rounded-l last:rounded-r', FILL[s.tone])}
                style={{ width: `${(s.value / total) * 100}%` }}
              />
            ))}
        </div>
      )}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-secondary">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', FILL[s.tone])} aria-hidden="true" />
            {s.label}
            <span className="font-semibold text-foreground">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export interface BarListItem {
  label: string
  value: number
}

/**
 * Magnitudes that compare against each other — e.g. members per team. One
 * hue throughout: the length carries the value, the label carries identity.
 */
export function BarList({ items, unit, emptyLabel = 'Nothing to show yet' }: { items: BarListItem[]; unit?: string; emptyLabel?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  if (items.length === 0) return <p className="text-sm text-foreground-muted">{emptyLabel}</p>

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.label} className="flex flex-col gap-1" title={`${item.label}: ${item.value}${unit ? ` ${unit}` : ''}`}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate text-foreground-secondary">{item.label}</span>
            <span className="font-semibold text-foreground">{item.value}</span>
          </div>
          <div className="h-2 w-full rounded bg-surface-secondary">
            <div className="h-full rounded bg-info" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
