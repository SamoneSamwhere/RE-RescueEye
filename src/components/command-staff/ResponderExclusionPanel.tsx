import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, ShieldOff, UserCheck } from 'lucide-react'
import { Panel, EmptyState } from '../ui'
import { api } from '../../lib/apiClient'

interface ResponderPosition {
  id: string
  name: string
  lat: number
  lng: number
}

interface RespondersResponse {
  responders: ResponderPosition[]
  exclusion_radius_m: number
  ttl_s: number
}

/**
 * Which of our own responders the detector currently knows about.
 *
 * The detector cannot tell a rescuer from a casualty — both are people to it —
 * so the console publishes responder positions and the gate refuses to call
 * anyone standing on one a casualty (api/services/casualty.py). That veto was
 * previously invisible: it either fired or it did not, and nothing on screen
 * said which, or whether any positions had reached the API at all.
 *
 * Positions expire server-side, so an empty list is a real state worth showing
 * rather than an error — it means the veto is inert right now, and a commander
 * should know that before trusting the queue.
 */
export function ResponderExclusionPanel() {
  const query = useQuery({
    queryKey: ['responder-positions'],
    queryFn: () => api.get<RespondersResponse>('/responders'),
    // Matches the client's own reporting interval: polling faster would only
    // re-render the same rows.
    refetchInterval: 15_000,
    retry: false,
  })

  const responders = query.data?.responders ?? []
  const radius = query.data?.exclusion_radius_m

  return (
    <Panel title="Responder Exclusion">
      {query.isError ? (
        <EmptyState
          icon={ShieldOff}
          title="Detection API unreachable"
          description="Responder positions cannot be published, so the exclusion check is inactive."
        />
      ) : responders.length === 0 ? (
        <EmptyState
          icon={ShieldOff}
          title="No responder positions reported"
          description="Nobody is being excluded from casualty detection right now."
        />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs text-foreground-secondary">
            <ShieldCheck className="size-3.5 text-success" />
            {responders.length} responder{responders.length === 1 ? '' : 's'} excluded within{' '}
            {radius ?? '—'}m of their reported position
          </p>
          <ul className="flex flex-col divide-y divide-border">
            {responders.map((responder) => (
              <li key={responder.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="flex min-w-0 items-center gap-2">
                  <UserCheck className="size-3.5 shrink-0 text-foreground-secondary" />
                  <span className="truncate text-sm text-foreground">
                    {responder.name || responder.id}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-foreground-muted">
                  {responder.lat.toFixed(5)}, {responder.lng.toFixed(5)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}
