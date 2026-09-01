import { MapPin } from 'lucide-react'
import { Panel, EmptyState } from '../ui'
import { cn } from '../../../lib/cn'
import type { IncidentPriority } from '../../types/incident'

interface MapPreviewPin {
  id: string
  priority: IncidentPriority
}

interface DamageMapPreviewProps {
  pins: MapPreviewPin[]
  title?: string
  emptyLabel?: string
}

const DOT_CLASSES: Record<IncidentPriority, string> = {
  LOW: 'bg-priority-low',
  MEDIUM: 'bg-priority-medium',
  HIGH: 'bg-priority-high',
  CRITICAL: 'bg-priority-critical',
}

const LEGEND_ORDER: IncidentPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const LEGEND_LABEL: Record<IncidentPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

/**
 * Deterministic pseudo-position so the same incident always renders at the
 * same spot. Uses two independent FNV-1a passes (id, then id+salt) so
 * near-identical ids like "incident-1" / "incident-2" still land far apart
 * — a simple rolling hash clusters those together.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function positionFor(id: string): { top: string; left: string } {
  const top = 10 + (fnv1a(id) % 80)
  const left = 6 + (fnv1a(`${id}#pos`) % 88)
  return { top: `${top}%`, left: `${left}%` }
}

/**
 * Preview only — incident locations are not yet tracked in the domain model,
 * so pins are laid out deterministically rather than on real coordinates.
 */
export function DamageMapPreview({
  pins,
  title = 'Damage Map Preview',
  emptyLabel = 'No open incidents to display',
}: DamageMapPreviewProps) {
  return (
    <Panel title={title}>
      {pins.length === 0 ? (
        <EmptyState icon={MapPin} title={emptyLabel} />
      ) : (
        <div className="flex flex-col gap-3">
          <div
            className="relative h-56 overflow-hidden rounded-md border border-border bg-surface-secondary"
            style={{
              backgroundImage:
                'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            {pins.map((pin) => {
              const pos = positionFor(pin.id)
              return (
                <span
                  key={pin.id}
                  className={cn('absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface', DOT_CLASSES[pin.priority])}
                  style={pos}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {LEGEND_ORDER.map((priority) => (
              <span key={priority} className="flex items-center gap-1.5 text-xs text-foreground-secondary">
                <span className={cn('size-1.5 rounded-full', DOT_CLASSES[priority])} />
                {LEGEND_LABEL[priority]}
              </span>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}
