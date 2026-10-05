import { Users } from 'lucide-react'
import { Panel, MissionStatusBadge, StatusIndicator, EmptyState } from '../ui'
import type { ResponderStatusItem } from './types'

interface ResponderStatusPanelProps {
  responders: ResponderStatusItem[]
}

export function ResponderStatusPanel({ responders }: ResponderStatusPanelProps) {
  return (
    <Panel title="Responder Status">
      {responders.length === 0 ? (
        <EmptyState icon={Users} title="No field responders on record" />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {responders.map((responder) => (
            <li key={responder.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <span className="text-sm text-foreground">{responder.name}</span>
              {responder.missionStatus ? (
                <MissionStatusBadge status={responder.missionStatus} />
              ) : (
                <StatusIndicator tone={responder.isActive ? 'success' : 'neutral'} label={responder.isActive ? 'Available' : 'Off duty'} />
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
