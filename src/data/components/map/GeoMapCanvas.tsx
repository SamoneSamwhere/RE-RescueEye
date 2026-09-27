import { useEffect, useMemo } from 'react'
import { MapContainer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { cn } from '../../../lib/cn'
import { computeBounds } from '../../../lib/mapProjection'
import { BaseTileLayer } from './BaseTileLayer'
import { FALLBACK_AOI, MIN_ZOOM, viewportBounds } from '../../../lib/mapViewport'
import type { MapMarker } from './types'

export interface GeoMapCanvasProps {
  markers: MapMarker[]
  selectedId: string | null
  onSelect: (marker: MapMarker) => void
  /**
   * The signed-in responder's own user id. Their marker is drawn as "You" so a
   * responder reading the map on a phone can find themselves without first
   * tapping every cyan dot.
   */
  selfResponderId?: string
  /** Sizing override for the map container — the mobile shell needs a shorter box than the desktop console. */
  className?: string
  /**
   * Collapse nearby markers into counted clusters that split as you zoom in.
   *
   * Off by default. On a phone the markers of one incident site overlap into an
   * unreadable pile at the zoom levels that fit a whole search area on screen,
   * which is where this earns its place; a wide desktop console showing the
   * same data usually does not need it.
   */
  cluster?: boolean
}

const DEFAULT_ZOOM = 14

type MarkerVisual = { color: string; radius: number }

const MARKER_STYLE: Record<MapMarker['kind'], MarkerVisual> = {
  INCIDENT: { color: '#ff3b3b', radius: 10 },
  DETECTION: { color: '#ffdc00', radius: 8 },
  RESPONDER: { color: '#00d4ff', radius: 7 },
}

/** Distinct from the other responders' cyan so "me" never reads as "a colleague". */
const SELF_STYLE: MarkerVisual = { color: '#00ff9c', radius: 9 }

function isSelf(marker: MapMarker, selfResponderId?: string): boolean {
  return marker.kind === 'RESPONDER' && !!selfResponderId && marker.responderId === selfResponderId
}

function markerLabel(marker: MapMarker, selfResponderId?: string): string {
  switch (marker.kind) {
    case 'INCIDENT':
      return `${marker.priority} incident · ${marker.status}`
    case 'DETECTION':
      return `${marker.category} · ${Math.round(marker.confidence * 100)}%`
    case 'RESPONDER': {
      const name = isSelf(marker, selfResponderId) ? 'You' : marker.name
      return marker.missionStatus ? `${name} · ${marker.missionStatus}` : name
    }
  }
}

/**
 * Keeps the viewport, and the pannable area, over the markers.
 *
 * Only refits when the *set* of coordinates changes, not on every render —
 * otherwise panning the map would be undone the moment anything upstream
 * re-rendered, which makes it impossible to look around.
 */
function ViewportController({ markers }: { markers: MapMarker[] }) {
  const map = useMap()
  const key = markers.map((m) => `${m.location.lat},${m.location.lng}`).join('|')

  useEffect(() => {
    // maxBounds is an init-only MapContainer prop, so it has to be re-applied
    // here whenever the data moves; otherwise the map stays clamped to whatever
    // was on screen at mount.
    map.setMaxBounds(viewportBounds(markers.map((m) => m.location)))

    // No markers yet: show the whole survey area rather than an arbitrary point.
    if (!markers.length) {
      map.fitBounds(FALLBACK_AOI, { padding: [24, 24] })
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

  // The mobile shell lays the map out inside a column that settles after the
  // first paint; without this Leaflet keeps the stale height and renders a
  // strip of grey where tiles should be.
  useEffect(() => {
    const frame = requestAnimationFrame(() => map.invalidateSize())
    return () => cancelAnimationFrame(frame)
  }, [map])

  return null
}

/**
 * Marker clustering, driven through Leaflet directly.
 *
 * react-leaflet has no cluster component, and markercluster wants real Leaflet
 * layers rather than React children, so the markers are built here instead of
 * as JSX. The styling deliberately mirrors the CircleMarker branch below —
 * same colours, same selected treatment — so switching clustering on does not
 * silently change what a marker means.
 */
function ClusterLayer({ markers, selectedId, onSelect, selfResponderId }: {
  markers: MapMarker[]
  selectedId: string | null
  onSelect: (marker: MapMarker) => void
  selfResponderId?: string
}) {
  const map = useMap()

  useEffect(() => {
    const group = L.markerClusterGroup({
      // A cluster that still covers the marker it replaced helps nobody; at the
      // tightest zoom the operator wants the individual casualties.
      disableClusteringAtZoom: 18,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 48,
    })

    for (const marker of markers) {
      const self = isSelf(marker, selfResponderId)
      const style = self ? SELF_STYLE : MARKER_STYLE[marker.kind]
      const isSelected = marker.id === selectedId
      const layer = L.circleMarker([marker.location.lat, marker.location.lng], {
        radius: isSelected ? style.radius + 4 : style.radius,
        color: isSelected ? '#ffffff' : style.color,
        weight: isSelected || self ? 3 : 2,
        fillColor: style.color,
        fillOpacity: 0.75,
      })
      layer.bindTooltip(markerLabel(marker, selfResponderId), { direction: 'top', offset: [0, -6] })
      layer.on('click', () => onSelect(marker))
      group.addLayer(layer)
    }

    map.addLayer(group)
    return () => {
      map.removeLayer(group)
    }
  }, [map, markers, selectedId, onSelect, selfResponderId])

  return null
}


/** Colour key for the marker kinds a map can show. */
export function MapLegend({ includeSelf = false }: { includeSelf?: boolean }) {
  const entries: Array<{ color: string; label: string }> = [
    { color: MARKER_STYLE.INCIDENT.color, label: 'Confirmed incident' },
    { color: MARKER_STYLE.DETECTION.color, label: 'Verified detection' },
    { color: MARKER_STYLE.RESPONDER.color, label: 'Responder' },
  ]
  if (includeSelf) entries.push({ color: SELF_STYLE.color, label: 'You' })

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground-secondary">
      {entries.map((entry) => (
        <span key={entry.label} className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: entry.color }} />
          {entry.label}
        </span>
      ))}
    </div>
  )
}

/**
 * Real basemap for the Damage Map.
 *
 * Replaces the percentage-positioned panel, which placed markers by CSS
 * `top`/`left` inside an empty rectangle — correct relative to each other, but
 * with no streets or terrain behind them, so nobody could tell which road a
 * casualty was near. OpenStreetMap tiles need no API key or billing.
 */
export function GeoMapCanvas({ markers, selectedId, onSelect, selfResponderId, className, cluster = false }: GeoMapCanvasProps) {
  const centre = useMemo<LatLngExpression>(() => {
    if (!markers.length) return [10.315, 123.895]
    return [markers[0].location.lat, markers[0].location.lng]
  }, [markers])

  const initialBounds = useMemo(() => viewportBounds(markers.map((m) => m.location)), [markers])

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-border',
        className ?? 'h-[calc(100vh-13rem)] min-h-[32rem]',
      )}
    >
      <MapContainer
        center={centre}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        // Panning is rubber-banded back to the area the data covers: this map is
        // an operational picture of one AOI, not a world atlas to wander.
        maxBounds={initialBounds}
        maxBoundsViscosity={1.0}
        scrollWheelZoom
        className="h-full w-full"
        // Leaflet paints its own background; without this the container shows
        // through as white in dark mode before tiles load.
        style={{ background: 'var(--color-surface-inverse)' }}
      >
        <BaseTileLayer />
        <ViewportController markers={markers} />

        {cluster ? (
          <ClusterLayer
            markers={markers}
            selectedId={selectedId}
            onSelect={onSelect}
            selfResponderId={selfResponderId}
          />
        ) : null}

        {(cluster ? [] : markers).map((marker) => {
          const self = isSelf(marker, selfResponderId)
          const style = self ? SELF_STYLE : MARKER_STYLE[marker.kind]
          const isSelected = marker.id === selectedId
          return (
            <CircleMarker
              key={marker.id}
              center={[marker.location.lat, marker.location.lng]}
              radius={isSelected ? style.radius + 4 : style.radius}
              pathOptions={{
                color: isSelected ? '#ffffff' : style.color,
                weight: isSelected || self ? 3 : 2,
                fillColor: style.color,
                fillOpacity: 0.75,
              }}
              eventHandlers={{ click: () => onSelect(marker) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {markerLabel(marker, selfResponderId)}
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
