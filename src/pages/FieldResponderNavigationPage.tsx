import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { MapContainer, CircleMarker, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  ChevronLeft,
  CornerDownLeft,
  CornerDownRight,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Loader2,
  Navigation,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BaseTileLayer } from '../components/map/BaseTileLayer'
import { MARKER_COLOR } from '../components/map/markerStyle'
import { Button } from '../components/ui'
import { useAuth } from '../features/auth'
import { useFieldResponderData } from '../features/field-responder'
import { useIncidentStore } from '../state/IncidentStore'
import { useDetectionStore } from '../state/DetectionStore'
import { fieldResponderMissionDetailPath, ROUTES } from '../routes/paths'
import { ARRIVE_RADIUS_M } from '../lib/navigation'
import {
  bearingDegrees,
  fetchRoute,
  formatDistance,
  formatDuration,
  pointAlongRoute,
  projectOntoRoute,
} from '../lib/routing'
import type { ManeuverIcon, NavRoute } from '../lib/routing'
import type { GeoPoint } from '../types/geo'

/** Further than this from the route line, on two fixes in a row, counts as off route. */
const OFF_ROUTE_M = 40
/** Never ask OSRM for a new route more often than this. */
const REROUTE_MIN_INTERVAL_MS = 10_000
/** A maneuver this close behind the responder is treated as already done. */
const PASSED_STEP_M = 8
const NAV_ZOOM = 17

const MANEUVER_ICON: Record<ManeuverIcon, LucideIcon> = {
  depart: Navigation,
  straight: ArrowUp,
  left: CornerUpLeft,
  right: CornerUpRight,
  'slight-left': ArrowUpLeft,
  'slight-right': ArrowUpRight,
  'sharp-left': CornerDownLeft,
  'sharp-right': CornerDownRight,
  uturn: RotateCcw,
  roundabout: RefreshCw,
  arrive: Flag,
}

/** Keeps the map centred on the responder as they move. */
function FollowResponder({ position }: { position: GeoPoint | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.panTo([position.lat, position.lng], { animate: true, duration: 0.8 })
  }, [map, position])
  return null
}

/**
 * Turns a compass heading into a map rotation that always takes the short way
 * round — 350° to 10° turns 20°, not 340° back the long way.
 */
function useContinuousRotation(heading: number): number {
  const [state, setState] = useState({ heading, rotation: -heading })
  if (state.heading !== heading) {
    const delta = ((((-heading - state.rotation) % 360) + 540) % 360) - 180
    setState({ heading, rotation: state.rotation + delta })
  }
  return state.rotation
}

/**
 * In-app turn-by-turn navigation to the mission's incident.
 *
 * The map follows the responder heading-up: it is drawn on an oversized square
 * that is rotated against the direction of travel, so the road ahead is always
 * "up" (Leaflet has no rotation of its own). The camera is locked while
 * navigating, as in Google Maps' driving mode. The route comes from OSRM and is
 * fetched again automatically when the responder leaves it.
 *
 * Position comes from the same continuous GPS watch that shares the
 * responder's location with Command Staff (see useLocationSharing), so the
 * Damage Map follows them while they navigate.
 */
export function FieldResponderNavigationPage() {
  const { missionId } = useParams<{ missionId: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { missions, arriveOnSite, arrivalCheck, location } = useFieldResponderData()
  const { incidents } = useIncidentStore()
  const { detections } = useDetectionStore()

  const mission = missions.find((m) => m.id === missionId)
  const incident = mission ? incidents.find((i) => i.id === mission.incidentId) : undefined
  const destination = incident ? detections.find((d) => d.id === incident.detectionId)?.location : undefined
  const position = location.position

  const [route, setRoute] = useState<NavRoute | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [routing, setRouting] = useState(false)
  // Bumped to ask for a fresh route (off route, or retry after an error).
  const [routeRequest, setRouteRequest] = useState(0)

  // The fetch reads the latest fix without re-running on every fix.
  const positionRef = useRef(position)
  useEffect(() => {
    positionRef.current = position
  })
  const lastFetchAt = useRef(0)
  const offRouteFixes = useRef(0)

  const hasFix = position !== null
  const destLat = destination?.lat
  const destLng = destination?.lng

  useEffect(() => {
    const from = positionRef.current
    if (!from || destLat === undefined || destLng === undefined) return
    const controller = new AbortController()
    lastFetchAt.current = Date.now()
    offRouteFixes.current = 0
    setRouting(true)
    fetchRoute(from, { lat: destLat, lng: destLng }, controller.signal)
      .then((next) => {
        setRoute(next)
        setRouteError(null)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setRouteError(error instanceof Error ? error.message : 'Could not get a route.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setRouting(false)
      })
    return () => controller.abort()
  }, [hasFix, routeRequest, destLat, destLng])

  // After a failed request, try again on the reroute interval.
  useEffect(() => {
    if (!routeError) return
    const timer = setTimeout(() => setRouteRequest((n) => n + 1), REROUTE_MIN_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [routeError])

  const progress = useMemo(() => (route && position ? projectOntoRoute(route, position) : null), [route, position])

  // Off route: recalculate once two fixes in a row are clearly away from the line
  // (one stray GPS jump must not throw the route away).
  useEffect(() => {
    if (!progress) return
    offRouteFixes.current = progress.offRouteBy > OFF_ROUTE_M ? offRouteFixes.current + 1 : 0
    if (offRouteFixes.current >= 2 && Date.now() - lastFetchAt.current >= REROUTE_MIN_INTERVAL_MS) {
      setRouteRequest((n) => n + 1)
    }
  }, [progress])

  const nextStep =
    route && progress ? route.steps.find((step) => step.startDistance > progress.along + PASSED_STEP_M) : undefined
  const remainingMeters = route && progress ? Math.max(0, route.distance - progress.along) : null
  const remainingSeconds =
    route && remainingMeters !== null && route.distance > 0 ? (route.duration * remainingMeters) / route.distance : null
  const eta =
    remainingSeconds !== null && location.updatedAt !== null
      ? new Date(location.updatedAt + remainingSeconds * 1000).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        })
      : null

  // Heading-up: the device's own heading while moving; otherwise the direction
  // of the road just ahead; otherwise straight at the incident.
  let heading = 0
  if (location.heading !== null) heading = location.heading
  else if (route && progress) heading = bearingDegrees(pointAlongRoute(route, progress.along), pointAlongRoute(route, progress.along + 30))
  else if (position && destination) heading = bearingDegrees(position, destination)
  const rotation = useContinuousRotation(heading)

  if (!session) return null
  if (!mission || !destination) return <Navigate to={ROUTES.fieldResponder} replace />
  // Navigation is only for a mission that is en route; anything else belongs on the detail screen.
  if (mission.status !== 'EN_ROUTE') return <Navigate to={fieldResponderMissionDetailPath(mission.id)} replace />

  const StepIcon = nextStep ? MANEUVER_ICON[nextStep.icon] : Navigation
  const arrival = arrivalCheck(mission.id)
  const center = position ?? destination

  function handleArrive() {
    if (!mission) return
    if (arriveOnSite(mission.id)) navigate(fieldResponderMissionDetailPath(mission.id))
  }

  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-md overflow-hidden border-x border-border bg-surface-inverse">
      {/* Oversized and rotated so no corner shows at any angle; the responder sits
          a little below centre so more of the road ahead is visible. */}
      <div
        className="absolute left-1/2 top-[60%] size-[150vmax] motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out"
        style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={NAV_ZOOM}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          boxZoom={false}
          keyboard={false}
          className="h-full w-full"
          style={{ background: 'var(--color-surface-inverse)' }}
        >
          <BaseTileLayer />
          {route ? (
            <>
              <Polyline positions={route.points.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#ffffff', weight: 11, opacity: 0.9 }} />
              <Polyline positions={route.points.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#2563eb', weight: 7, opacity: 0.95 }} />
            </>
          ) : null}
          <CircleMarker
            center={[destination.lat, destination.lng]}
            radius={11}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: MARKER_COLOR.INCIDENT, fillOpacity: 1 }}
          />
          {position ? (
            <CircleMarker
              center={[position.lat, position.lng]}
              radius={9}
              pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}
            />
          ) : null}
          <FollowResponder position={position} />
        </MapContainer>
      </div>

      {/* Next maneuver */}
      <div className="absolute inset-x-3 top-3 z-[1000] flex flex-col gap-2">
        <Link
          to={fieldResponderMissionDetailPath(mission.id)}
          className="inline-flex w-fit items-center gap-1 rounded-full bg-surface/90 px-3 py-1 text-xs font-medium text-foreground shadow-panel backdrop-blur hover:bg-surface"
        >
          <ChevronLeft className="size-3.5" />
          Mission
        </Link>
        <div className="flex items-center gap-3 rounded-lg bg-accent px-4 py-3 text-foreground-inverse shadow-xl">
          <StepIcon className="size-9 shrink-0" />
          <div className="min-w-0">
            {nextStep && progress ? (
              <>
                <p className="text-2xl font-bold leading-tight">{formatDistance(nextStep.startDistance - progress.along)}</p>
                <p className="text-sm font-medium leading-snug">{nextStep.instruction}</p>
              </>
            ) : (
              <p className="text-base font-semibold">
                {!position
                  ? location.status === 'denied'
                    ? 'Location access is blocked — allow it in your browser to navigate.'
                    : 'Waiting for GPS…'
                  : routeError
                    ? `${routeError} Retrying…`
                    : 'Finding the route…'}
              </p>
            )}
          </div>
        </div>
        {routing && route ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1 text-xs font-medium text-foreground shadow-panel">
            <Loader2 className="size-3.5 animate-spin" />
            Rerouting…
          </span>
        ) : null}
      </div>

      {/* Trip summary + arrive */}
      <div className="absolute inset-x-0 bottom-0 z-[1000] flex flex-col gap-3 rounded-t-2xl border-t border-border bg-surface px-4 pb-5 pt-4 shadow-xl">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {remainingSeconds !== null ? formatDuration(remainingSeconds) : '—'}
            </p>
            <p className="text-sm text-foreground-secondary">
              {remainingMeters !== null ? formatDistance(remainingMeters) : '—'}
              {eta ? ` · ETA ${eta}` : ''}
            </p>
          </div>
        </div>
        <Button size="lg" className="w-full" disabled={!arrival.canArrive} onClick={handleArrive}>
          <Flag className="size-4" />
          Arrive On-Site
        </Button>
        {!arrival.canArrive ? (
          <p className="-mt-1 text-center text-xs text-foreground-muted">
            {arrival.distanceM === null
              ? 'Waiting for your GPS position to unlock Arrive On-Site.'
              : `Unlocks within ${ARRIVE_RADIUS_M} m of the incident — you are ${formatDistance(arrival.distanceM)} away.`}
          </p>
        ) : null}
        <p className="text-center text-[10px] text-foreground-muted">
          ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
            OpenStreetMap
          </a>{' '}
          contributors · Routing by OSRM
        </p>
      </div>
    </div>
  )
}
