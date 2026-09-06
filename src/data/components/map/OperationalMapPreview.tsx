import { useEffect } from 'react'
import { MapContainer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { MapPin } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { Panel, EmptyState } from '../ui'
import { cn } from '../../../lib/cn'
import { BaseTileLayer } from './BaseTileLayer'
import { FALLBACK_AOI, MIN_ZOOM, viewportBounds } from '../../../lib/mapViewport'
import { computeBounds } from '../../../lib/mapProjection'
import type { GeoPoint } from '../../../types/geo'
import type { IncidentPriority } from '../../../types/incident'

export interface MapPreviewPin {
  id: string
  priority: IncidentPriority
  location: GeoPoint
  label?: string
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

/**
 * Mirrors --color-priority-* in tokens.css. Leaflet writes `stroke`/`fill` as
 * SVG presentation attributes, which do not accept `var(--token)`, so these
 * have to be literals — keep them in step with the stylesheet.
 */
const DOT_COLOR: Record<IncidentPriority, string> = {
  LOW: '#0284c7',
  MEDIUM: '#d97706',
  HIGH: '#ea580c',
  CRITICAL: '#dc2626',
}

const LEGEND_ORDER: IncidentPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const LEGEND_LABEL: Record<IncidentPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

function FitPins({ points }: { points: GeoPoint[] }) {
  const map = useMap()
  const key = points.map((p) => `${p.lat},${p.lng}`).join('|')

  useEffect(() => {
    map.setMaxBounds(viewportBounds(points))
    if (!points.length) {
      map.fitBounds(FALLBACK_AOI, { padding: [16, 16] })
      return
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15)
      return
    }
    const b = computeBounds(points)
    map.fitBounds(
      [
        [b.minLat, b.minLng],
        [b.maxLat, b.maxLng],
      ],
      { padding: [28, 28], maxZoom: 16 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // The dashboard reveals this panel with a transition, so the container has
  // no final height on first paint; without this Leaflet caches the wrong size
  // and leaves grey gaps where tiles should be.
  useEffect(() => {
    const frame = requestAnimationFrame(() => map.invalidateSize())
    return () => cancelAnimationFrame(frame)
  }, [map])

  return null
}

/**
 * Compact real basemap for dashboard and detail contexts — the same
 * OpenStreetMap tiles as the full Damage Map, sized to sit inside a panel.
 *
 * Replaces a deterministic hash-to-percentage layout that scattered pins
 * across an empty grid. Those positions were stable but fictional: two pins
 * next to each other implied nothing about the incidents being near each
 * other, which is the one thing a map is for.
 */
export function DamageMapPreview({
  pins,
  title = 'Damage Map Preview',
  emptyLabel = 'No open incidents to display',
}: DamageMapPreviewProps) {
  const points = pins.map((pin) => pin.location)

  return (
    <Panel title={title}>
      {pins.length === 0 ? (
        <EmptyState icon={MapPin} title={emptyLabel} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="h-56 overflow-hidden rounded-md border border-border">
            <MapContainer
              center={[pins[0].location.lat, pins[0].location.lng]}
              zoom={14}
              minZoom={MIN_ZOOM}
              maxBounds={viewportBounds(points)}
              maxBoundsViscosity={1.0}
              // A preview sits inside a scrolling dashboard: a wheel over it
              // should scroll the page, not zoom the map out from under it.
              scrollWheelZoom={false}
              className="h-full w-full"
              style={{ background: 'var(--color-surface-inverse)' }}
            >
              <BaseTileLayer />
              <FitPins points={points} />
              {pins.map((pin) => (
                <CircleMarker
                  key={pin.id}
                  center={[pin.location.lat, pin.location.lng]}
                  radius={7}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 2,
                    fillColor: DOT_COLOR[pin.priority],
                    fillOpacity: 0.9,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -6]}>
                    {pin.label ?? `${LEGEND_LABEL[pin.priority]} priority`}
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
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
