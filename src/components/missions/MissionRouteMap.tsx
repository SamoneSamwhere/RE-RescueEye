import { Panel } from '../ui'
import { GeoRouteMap } from '../map'
import { distanceKm } from '../../lib/geo'
import type { GeoPoint } from '../../types/geo'

interface MissionRouteMapProps {
  /** The responder's shared position, absent until location sharing reports a fix. */
  origin?: GeoPoint
  /** The incident the mission was dispatched to. */
  destination: GeoPoint
  isEnRoute: boolean
}

/**
 * The navigation section of a mission: the responder and the incident plotted
 * on a real basemap, with the straight-line distance between them.
 *
 * Replaces the earlier grid-and-diagonal sketch, which conveyed only that the
 * two points were not in the same place. This shows which streets lie between
 * them — still short of turn-by-turn routing, which remains out of scope.
 */
export function MissionRouteMap({ origin, destination, isEnRoute }: MissionRouteMapProps) {
  const distance = origin ? distanceKm(origin, destination) : undefined

  return (
    <Panel title="Navigation">
      <GeoRouteMap origin={origin} destination={destination} />
      <p className="mt-2 text-sm text-foreground-secondary">
        {distance !== undefined
          ? `${distance.toFixed(1)} km ${isEnRoute ? 'remaining to' : 'to'} incident location`
          : 'Your location is unavailable — showing the incident location only.'}
      </p>
      <p className="text-xs text-foreground-muted">
        Straight-line bearing, not a road route. Live turn-by-turn GPS navigation is not yet available in this preview.
      </p>
    </Panel>
  )
}
