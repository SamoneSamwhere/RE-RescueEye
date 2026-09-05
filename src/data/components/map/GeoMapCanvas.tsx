import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { computeBounds } from '../../../lib/mapProjection'
import type { MapMarker } from './types'

export interface GeoMapCanvasProps {
  markers: MapMarker[]
  selectedId: string | null
  onSelect: (marker: MapMarker) => void
}

/**
 * The Cebu City area of interest, matching CEBU_LAT/CEBU_LNG in the API's
 * detection store — the same box the drone survey is simulated within, so the
 * map can never show ground the platform does not operate over.
 */
const CEBU_BOUNDS: LatLngBoundsExpression = [
  [10.28, 123.87],
  [10.35, 123.92],
]
const CEBU_CENTRE: LatLngExpression = [10.315, 123.895]
const DEFAULT_ZOOM = 14
/** Zooming out past this would put the AOI in a sea of irrelevant map. */
const MIN_ZOOM = 12

const MARKER_STYLE: Record<MapMarker['kind'], { color: string; radius: number }> = {
  INCIDENT: { color: '#ff3b3b', radius: 10 },
  DETECTION: { color: '#ffdc00', radius: 8 },
  RESPONDER: { color: '#00d4ff', radius: 7 },
}

function markerLabel(marker: MapMarker): string {
  switch (marker.kind) {
    case 'INCIDENT':
      return `${marker.priority} incident · ${marker.status}`
    case 'DETECTION':
      return `${marker.category} · ${Math.round(marker.confidence * 100)}%`
    case 'RESPONDER':
      return marker.missionStatus ? `${marker.name} · ${marker.missionStatus}` : marker.name
  }
}

/**
 * Keeps the viewport over the markers.
 *
 * Only refits when the *set* of coordinates changes, not on every render —
 * otherwise panning the map would be undone the moment anything upstream
 * re-rendered, which makes it impossible to look around.
 */
function FitToMarkers({ markers }: { markers: MapMarker[] }) {
  const map = useMap()
  const key = markers.map((m) => `${m.location.lat},${m.location.lng}`).join('|')

  useEffect(() => {
    // No markers yet: show the whole survey area rather than an arbitrary point.
    if (!markers.length) {
      map.fitBounds(CEBU_BOUNDS, { padding: [24, 24] })
      return
    }
    if (markers.length === 1) {
      map.setView([markers[0].location.lat, markers[0].location.lng], 16)
      return
    }
    const b = computeBounds(markers.map((m) => m.location))
    map.fitBounds(
      [
        [b.minLat, b.minLng],
        [b.maxLat, b.maxLng],
      ],
      { padding: [40, 40], maxZoom: 17 },
    )
    // `key` is the real dependency; `markers`/`map` are stable enough alongside it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return null
}

/**
 * Real basemap for the Damage Map.
 *
 * Replaces the percentage-positioned panel, which placed markers by CSS
 * `top`/`left` inside an empty rectangle — correct relative to each other, but
 * with no streets or terrain behind them, so a commander could not tell which
 * road a casualty was near. OpenStreetMap tiles need no API key or billing.
 */
export function GeoMapCanvas({ markers, selectedId, onSelect }: GeoMapCanvasProps) {
  const centre = useMemo<LatLngExpression>(() => {
    if (!markers.length) return CEBU_CENTRE
    return [markers[0].location.lat, markers[0].location.lng]
  }, [markers])

  return (
    <div className="h-[calc(100vh-13rem)] min-h-[32rem] overflow-hidden rounded-md border border-border">
      <MapContainer
        center={centre}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        // Panning is rubber-banded back into the survey area: this map is an
        // operational picture of one AOI, not a world atlas to wander.
        maxBounds={CEBU_BOUNDS}
        maxBoundsViscosity={1.0}
        scrollWheelZoom
        className="h-full w-full"
        // Leaflet paints its own background; without this the container shows
        // through as white in dark mode before tiles load.
        style={{ background: 'var(--color-surface-inverse)' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FitToMarkers markers={markers} />

        {markers.map((marker) => {
          const style = MARKER_STYLE[marker.kind]
          const isSelected = marker.id === selectedId
          return (
            <CircleMarker
              key={marker.id}
              center={[marker.location.lat, marker.location.lng]}
              radius={isSelected ? style.radius + 4 : style.radius}
              pathOptions={{
                color: isSelected ? '#ffffff' : style.color,
                weight: isSelected ? 3 : 2,
                fillColor: style.color,
                fillOpacity: 0.75,
              }}
              eventHandlers={{ click: () => onSelect(marker) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {markerLabel(marker)}
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
