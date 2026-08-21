import { CheckCircle2, MapPin, Users } from 'lucide-react'
import { Panel, Badge, MissionStatusBadge, StatusIndicator, Button, EmptyState } from '../ui'
import { cn } from '../../lib/cn'
import type { ResponderCandidate } from './types'

interface ResponderSelectionPanelProps {
  candidates: ResponderCandidate[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNotify: () => void
}

/**
 * Lets Command Staff pick which Field Responder to notify for one incident,
 * then hand off to a confirmation step. Creating the Mission/Notification
 * and updating state happens in the parent's onNotify handler, not here.
 */
export function ResponderSelectionPanel({ candidates, selectedId, onSelect, onNotify }: ResponderSelectionPanelProps) {
  const selected = candidates.find((candidate) => candidate.id === selectedId) ?? null

  return (
    <Panel title="Select Field Responder to Notify">
      {candidates.length === 0 ? (
        <EmptyState icon={Users} title="No field responders in this agency" />
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col divide-y divide-border">
            {candidates.map((candidate) => {
              const isSelected = candidate.id === selectedId
              return (
                <li key={candidate.id}>
                  <button
                    type="button"
                    disabled={!candidate.isAvailable}
                    onClick={() => onSelect(candidate.id)}
                    className={cn(
                      'flex w-full flex-wrap items-center justify-between gap-3 px-1 py-2.5 text-left transition-colors',
                      isSelected ? 'bg-accent-subtle' : 'hover:bg-surface-secondary',
                      !candidate.isAvailable && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                          isSelected ? 'border-accent bg-accent text-foreground-inverse' : 'border-border-strong',
                        )}
                      >
                        {isSelected ? <CheckCircle2 className="size-3.5" /> : null}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{candidate.name}</p>
                        <p className="flex items-center gap-1 text-xs text-foreground-muted">
                          <MapPin className="size-3" />
                          {candidate.currentLocation
                            ? `${candidate.currentLocation.lat.toFixed(4)}, ${candidate.currentLocation.lng.toFixed(4)}`
                            : 'Location unavailable'}
                          {candidate.distanceKm !== null ? ` · ${candidate.distanceKm.toFixed(1)} km away` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge tone={candidate.accountStatus === 'ACTIVE' ? 'success' : 'neutral'}>
                        {candidate.accountStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </Badge>
                      {candidate.missionStatus ? (
                        <MissionStatusBadge status={candidate.missionStatus} />
                      ) : (
                        <StatusIndicator
                          tone={candidate.isAvailable ? 'success' : 'neutral'}
                          label={candidate.isAvailable ? 'Available' : 'Off duty'}
                        />
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-xs text-foreground-muted">
              {selected ? `Selected: ${selected.name}` : 'Select an available responder to notify.'}
            </p>
            <Button size="sm" disabled={!selected} onClick={onNotify}>
              Notify Selected Responder
            </Button>
          </div>
        </div>
      )}
    </Panel>
  )
}
