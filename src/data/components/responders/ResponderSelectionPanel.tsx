import { Check, MapPin, Users } from 'lucide-react'
import { Panel, Badge, MissionStatusBadge, StatusIndicator, Button, EmptyState } from '../ui'
import { cn } from '../../../lib/cn'
import type { ResponderCandidate } from './types'

interface ResponderSelectionPanelProps {
  candidates: ResponderCandidate[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onNotify: () => void
  /** True once the incident already has a response team — new picks join it. */
  hasTeam?: boolean
}

/**
 * Lets Command Staff select the nearest available Field Responders for one
 * incident and alert them together. The people alerted become the incident's
 * response team; selecting more later adds them to that team. Creating the
 * Missions/Notifications happens in the parent's onNotify handler, not here.
 */
export function ResponderSelectionPanel({
  candidates,
  selectedIds,
  onToggle,
  onNotify,
  hasTeam = false,
}: ResponderSelectionPanelProps) {
  // Only responders who can take this incident are offered. Listing everyone
  // with the busy and off-duty rows greyed out made the reviewer scan past a
  // wall of people they could not pick to find the one or two they could.
  // Candidates arrive nearest first.
  const available = candidates.filter((candidate) => candidate.isAvailable)
  const unavailableCount = candidates.length - available.length
  const selectedCount = available.filter((candidate) => selectedIds.includes(candidate.id)).length

  const title = hasTeam ? 'Add Responders to the Response Team' : 'Select Responders to Alert'

  return (
    <Panel title={title}>
      {candidates.length === 0 ? (
        <EmptyState icon={Users} title="No field responders in this agency" />
      ) : available.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No field responders available right now"
          description={`All ${candidates.length} are on a mission or off duty.`}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-foreground-muted">
            Nearest available responders first. Everyone you alert {hasTeam ? 'joins' : 'forms'} this incident&apos;s
            response team.
          </p>
          <ul className="flex flex-col divide-y divide-border">
            {available.map((candidate) => {
              const isSelected = selectedIds.includes(candidate.id)
              return (
                <li key={candidate.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => onToggle(candidate.id)}
                    className={cn(
                      'flex w-full flex-wrap items-center justify-between gap-3 px-1 py-2.5 text-left transition-colors',
                      isSelected ? 'bg-accent-subtle' : 'hover:bg-surface-secondary',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded border-2',
                          isSelected ? 'border-accent bg-accent text-foreground-inverse' : 'border-border-strong',
                        )}
                      >
                        {isSelected ? <Check className="size-3.5" /> : null}
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
                        <StatusIndicator tone="success" label="Available" />
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-xs text-foreground-muted">
              {selectedCount > 0 ? `${selectedCount} selected.` : 'Select one or more available responders.'}
              {unavailableCount > 0 ? ` ${unavailableCount} on a mission or off duty not shown.` : ''}
            </p>
            <Button size="sm" disabled={selectedCount === 0} onClick={onNotify}>
              {selectedCount > 1 ? `Alert ${selectedCount} Responders` : 'Alert Selected Responder'}
            </Button>
          </div>
        </div>
      )}
    </Panel>
  )
}
