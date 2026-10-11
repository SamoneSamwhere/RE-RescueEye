import type { MetricTone } from './MetricBars'

/** Theme tokens, so the rings follow light and dark mode with the rest of the app. */
const STROKE: Record<MetricTone, string> = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  info: 'var(--color-info)',
  neutral: 'var(--color-neutral)',
}

export interface DonutSegment {
  label: string
  value: number
  tone: MetricTone
}

interface DonutChartProps {
  segments: DonutSegment[]
  /** Big number in the middle; defaults to the sum of all segments. */
  centerValue?: number
  centerLabel: string
  size?: number
}

const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * A whole split into parts as a ring, with the total in the hole. Pair it with
 * a labelled legend: the ring shows proportion, the legend carries the counts,
 * so meaning never depends on telling colors apart. Also works as a single
 * progress ring — pass one colored segment plus a neutral remainder.
 */
export function DonutChart({ segments, centerValue, centerLabel, size = 140 }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  let offset = 0

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${centerLabel}: ${segments.map((s) => `${s.label} ${s.value}`).join(', ')}`}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="12" style={{ stroke: 'var(--color-surface-secondary)' }} />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const length = (s.value / total) * CIRCUMFERENCE
              const circle = (
                <circle
                  key={s.label}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  strokeWidth="12"
                  strokeDasharray={`${Math.max(length - 1, 0)} ${CIRCUMFERENCE}`}
                  strokeDashoffset={-offset}
                  style={{ stroke: STROKE[s.tone] }}
                >
                  <title>{`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}</title>
                </circle>
              )
              offset += length
              return circle
            })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold leading-tight text-foreground">{centerValue ?? total}</span>
        <span className="text-xs text-foreground-secondary">{centerLabel}</span>
      </div>
    </div>
  )
}

const DOT: Record<MetricTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-neutral',
}

/** A ring with its counted legend beside it — the standard summary block for a dashboard panel. */
export function DonutBreakdown({ segments, centerValue, centerLabel, size }: DonutChartProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <DonutChart segments={segments} centerValue={centerValue} centerLabel={centerLabel} size={size} />
      <ul className="flex min-w-40 flex-1 flex-col divide-y divide-border">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <span className="flex items-center gap-2 text-sm text-foreground-secondary">
              <span className={`size-2.5 rounded-full ${DOT[s.tone]}`} aria-hidden="true" />
              {s.label}
            </span>
            <span className="text-lg font-semibold text-foreground">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
