import { useEffect } from 'react'
import { MapContainer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '../../../lib/cn'
import { BaseTileLayer } from './BaseTileLayer'
import { MIN_ZOOM, viewportBounds } from '../../../lib/mapViewport'
import type { GeoPoint } from '../../../types/geo'

export interface GeoRouteMapProps {
  /** The responder's own position. Undefined when location sharing has nothing to report yet. */
  origin?: GeoPoint
  /** The incident being responded to. */
  destination: GeoPoint
  originLabel?: string
  destinationLabel?: string
  className?: string
}

const ORIGIN_COLOR = '#00ff9c'
const DESTINATION_COLOR = '#ff3b3b'

/** Frames both ends of the route, or just the destination when there is no fix on the responder. */
function FitRoute({ points }: { points: GeoPoint[] }) {
  const map = useMap()
  const key = points.map((p) => `${p.lat},${p.lng}`).join('|')

  useEffect(() => {
    map.setMaxBounds(viewportBounds(points))
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 16)
      return
    }
    map.fitBounds(
      points.map((p) => [p.lat, p.lng] as [number, number]),
      { padding: [36, 36], maxZoom: 16 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    const frame = requestAnimationFrame(() => map.invalidateSize())
    return () => cancelAnimationFrame(frame)
  }, [map])

  return null
}

/**
 * Point-to-point map for a single mission: where the responder is, where the
 * incident is, and the straight-line bearing between them on a real basemap.
 *
 * The connecting line is deliberately dashed — it is a direct bearing, not a
 * routed path down actual streets, and a solid line would read as turn-by-turn
 * guidance the platform does not provide.
 */
export function GeoRouteMap({
  origin,
  destination,
  originLabel = 'You',
  destinationLabel = 'Incident',
  className,
}: GeoRouteMapProps) {
  const points = origin ? [origin, destination] : [destination]
  const routeLine: [number, number][] = origin
    ? [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ]
    : []

  return (
    <div className={cn('overflow-hidden rounded-md border border-border', className ?? 'h-56')}>
      <MapContainer
        center={[destination.lat, destination.lng]}
        zoom={15}
        minZoom={MIN_ZOOM}
        maxBounds={viewportBounds(points)}
        maxBoundsViscosity={1.0}
        // Left off so a two-finger scroll past the map on a phone, or a wheel
        // scroll in the desktop preview, keeps scrolling the mission page
        // instead of zooming the map out from under the reader.
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ background: 'var(--color-surface-inverse)' }}
      >
        <BaseTileLayer />
        <FitRoute points={points} />

        {origin ? (
          // Drawn twice: a pale casing under a dark dashed line. A single
          // stroke in either colour disappears against half the basemap —
          // white vanishes over pale streets, dark over shadowed terrain —
          // and this is the one line on the map a responder must be able to
          // follow.
          <>
            <Polyline positions={routeLine} pathOptions={{ color: '#ffffff', weight: 6, opacity: 0.9 }} />
            <Polyline
              positions={routeLine}
              pathOptions={{ color: '#1f2937', weight: 2.5, opacity: 0.95, dashArray: '6 6' }}
            />
          </>
        ) : null}

        {origin ? (
          <CircleMarker
            center={[origin.lat, origin.lng]}
            radius={8}
            pathOptions={{ color: ORIGIN_COLOR, weight: 3, fillColor: ORIGIN_COLOR, fillOpacity: 0.75 }}
          >
            <Tooltip direction="top" offset={[0, -6]} permanent>
              {originLabel}
            </Tooltip>
          </CircleMarker>
        ) : null}

        <CircleMarker
          center={[destination.lat, destination.lng]}
          radius={10}
          pathOptions={{
            color: DESTINATION_COLOR,
            weight: 3,
            fillColor: DESTINATION_COLOR,
            fillOpacity: 0.75,
          }}
        >
          <Tooltip direction="top" offset={[0, -6]} permanent>
            {destinationLabel}
          </Tooltip>
        </CircleMarker>
      </MapContainer>
    </div>
  )
}
