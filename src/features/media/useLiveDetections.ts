/**
 * Ingests real detections from the Python API into the app's Detection store.
 *
 * Everything downstream — Detection Review, verify/reject, incident creation,
 * the Damage Map — already works off that store, so feeding real records in at
 * this one point makes the whole existing flow operate on live drone output
 * instead of `mockAiService`. Nothing downstream needs to know the difference.
 *
 * Two rules this deliberately preserves:
 *
 *  - Ingested detections arrive as **PENDING**. A detection is a suggestion,
 *    not an operational fact (see types/detection.ts), and the map only plots
 *    what Command Staff has verified. Auto-verifying would defeat both.
 *  - Their location is the **drone's position** at the moment of the frame,
 *    which is what the API already stamps on every detection in a frame.
 */
import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, apiUrl } from '../../lib/apiClient'
import { distanceKm } from '../../lib/geo'
import type {
  BoundingBox,
  DamageClassification,
  Detection,
  DetectionCategory,
} from '../../types/detection'

/** One detection as the API stores it — pixel bbox, drone lat/lng. */
export interface ApiDetection {
  id: string
  class: string
  confidence: number
  bbox: { x: number; y: number; w: number; h: number }
  timestamp: string
  lat: number
  lng: number
  inference_time_ms: number
  frame_width: number
  frame_height: number
  has_snapshot: boolean
  /** Same subject keeps this id across frames; null when untracked. */
  track_id: number | null
}

/** JPEG crop of the subject, served straight from the API. */
export const detectionSnapshotUrl = (apiId: string) => apiUrl(`/detections/${apiId}/snapshot`)

interface RecentResponse {
  detections: ApiDetection[]
}

/** Ids are prefixed so an ingested record can never collide with a mock one. */
export const LIVE_DETECTION_PREFIX = 'api-'

const DAMAGE_BY_CLASS: Record<string, DamageClassification> = {
  structural_damage: 'STRUCTURAL',
  fire_damage: 'PROPERTY',
  flood_damage: 'PROPERTY',
}

function toCategory(cls: string): DetectionCategory {
  return cls === 'casualty' ? 'CASUALTY' : 'DAMAGE'
}

/**
 * Pixel box -> percentage box. The review UI positions the overlay with
 * `${x}%`, so a pixel box would render far outside the preview. Falls back to
 * a centred placeholder when the API didn't report a frame size, rather than
 * dividing by zero.
 */
function toPercentBox(d: ApiDetection): BoundingBox {
  if (!d.frame_width || !d.frame_height) return { x: 40, y: 40, width: 20, height: 20 }
  return {
    x: (d.bbox.x / d.frame_width) * 100,
    y: (d.bbox.y / d.frame_height) * 100,
    width: (d.bbox.w / d.frame_width) * 100,
    height: (d.bbox.h / d.frame_height) * 100,
  }
}

export function toDetection(d: ApiDetection, mediaAssetId: string): Detection {
  const category = toCategory(d.class)
  return {
    // Keyed by subject, not by frame: re-detecting the same casualty updates
    // this record instead of creating another one to review.
    id: `${LIVE_DETECTION_PREFIX}${subjectKey(d)}`,
    mediaAssetId,
    category,
    // Only meaningful for DAMAGE; leaving it set on a casualty would show a
    // damage chip on a person.
    damageClassification: category === 'DAMAGE' ? DAMAGE_BY_CLASS[d.class] : undefined,
    confidence: d.confidence,
    boundingBox: toPercentBox(d),
    location: { lat: d.lat, lng: d.lng },
    detectedAt: d.timestamp,
    validationStatus: 'PENDING',
    snapshotUrl: d.has_snapshot ? detectionSnapshotUrl(d.id) : undefined,
  }
}

interface UseLiveDetectionsOptions {
  /** Media asset the ingested detections hang off — this is what scopes them to an agency. */
  mediaAssetId: string | undefined
  /** Detections already in the store, used to collapse repeat sightings. */
  existing: Detection[]
  onDetection: (detection: Detection) => void
  /** Used to upgrade an existing record when a better frame of the same subject arrives. */
  onUpdateDetection: (detectionId: string, patch: Partial<Detection>) => void
  enabled?: boolean
  pollMs?: number
}

/**
 * Stable key for "the same casualty" within one unbroken track. The tracker
 * keeps one id per subject across consecutive frames, so this collapses a
 * burst of sightings into one. Untracked detections fall back to their own id.
 */
function subjectKey(d: ApiDetection): string {
  return d.track_id != null ? `track-${d.track_id}` : `one-${d.id}`
}

/**
 * Two pending casualties closer than this are treated as the same person.
 *
 * Track ids alone are not enough: they only ever increase, so every time the
 * tracker loses and re-acquires someone — which happens on any scene cut, and
 * once per loop on a repeating clip — the same casualty reappears as a brand
 * new subject. Measured on the demo feed that is ~9 "subjects" in 45 seconds
 * for one person lying still, which is exactly the queue flooding this avoids.
 *
 * Detections are stamped with the drone's position rather than the casualty's,
 * so the radius has to cover how far the drone travels while circling one
 * subject (~35m on the demo track), with margin. The trade-off is explicit:
 * two genuinely distinct casualties closer together than this merge into one
 * review item. For a search area that is the safer failure — a missed row is
 * worse than a merged one, and the reviewer still sees the strongest frame.
 */
const SAME_CASUALTY_RADIUS_KM = 0.12

/**
 * How many casualties may sit awaiting a decision at once.
 *
 * Proximity merging alone cannot hold the queue down here: a detection carries
 * the *drone's* position, not the casualty's, and the drone keeps flying — over
 * one buffer window it covers ~460m, so a single stationary casualty is
 * reported from points far enough apart that no honest radius merges them
 * without also merging genuinely different people.
 *
 * So the queue is capped instead. One casualty is presented, decided on, and
 * only then is the next admitted. An unbounded queue that nobody can keep up
 * with is worse than a short one: it buries the casualty that needs help.
 *
 * The cost is explicit — while one casualty is pending, a second is not shown.
 * Raise this once detections are georeferenced to the casualty rather than the
 * drone, which is what would make proximity merging trustworthy on its own.
 */
const MAX_PENDING_CASUALTIES = 1

function isSameCasualty(a: Detection, b: Detection): boolean {
  return (
    a.category === 'CASUALTY' &&
    b.category === 'CASUALTY' &&
    distanceKm(a.location, b.location) <= SAME_CASUALTY_RADIUS_KM
  )
}

/**
 * Polls the API and pushes any detection the store hasn't seen.
 *
 * The API keeps a rolling buffer, so the same records come back every poll —
 * de-duplication by id is what makes this safe to run continuously.
 */
export function useLiveDetections({
  mediaAssetId,
  existing,
  onDetection,
  onUpdateDetection,
  enabled = true,
  pollMs = 3000,
}: UseLiveDetectionsOptions) {
  const query = useQuery({
    queryKey: ['live-detections'],
    queryFn: () => api.get<RecentResponse>('/detections/recent?limit=50'),
    refetchInterval: pollMs,
    enabled: enabled && !!mediaAssetId,
    // A detection feed that stops on blur would silently miss casualties while
    // the commander is looking at another window.
    refetchIntervalInBackground: true,
    retry: false,
  })

  // Held in a ref so the ingest effect doesn't re-run (and re-ingest everything)
  // on every render just because the caller passed a fresh Set or closure.
  // Updated in its own effect rather than during render — a ref write during
  // render is a side effect, and this effect is declared first so the values
  // are current by the time the ingest effect below runs.
  const latest = useRef({ existing, onDetection, onUpdateDetection, mediaAssetId })
  useEffect(() => {
    latest.current = { existing, onDetection, onUpdateDetection, mediaAssetId }
  })

  useEffect(() => {
    const items = query.data?.detections
    if (!items?.length) return
    const { existing: current, onDetection: emit, onUpdateDetection: patch, mediaAssetId: assetId } =
      latest.current
    if (!assetId) return

    const byId = new Map(current.map((d) => [d.id, d]))

    // Keep only the strongest sighting of each subject in this batch, so a
    // burst of frames produces one decision rather than a queue of near
    // duplicates. Oldest first, so store ordering ends up chronological.
    const best = new Map<string, ApiDetection>()
    for (const item of [...items].reverse()) {
      const key = subjectKey(item)
      const prev = best.get(key)
      if (!prev || item.confidence > prev.confidence) best.set(key, item)
    }

    // Counted once per batch and kept in step below, so a burst of sightings
    // cannot slip several casualties past the cap in a single pass.
    let pendingCasualties = current.filter(
      (d) => d.category === 'CASUALTY' && d.validationStatus === 'PENDING',
    ).length

    for (const item of best.values()) {
      const next = toDetection(item, assetId)
      // Same track, or a still-pending casualty close enough to be the same
      // person under a new track id after a re-acquire.
      const already =
        byId.get(next.id) ??
        current.find((d) => d.validationStatus === 'PENDING' && isSameCasualty(d, next)) ??
        // At the cap, a new sighting refreshes the casualty already under
        // review rather than queueing behind it.
        (next.category === 'CASUALTY' && pendingCasualties >= MAX_PENDING_CASUALTIES
          ? current.find((d) => d.category === 'CASUALTY' && d.validationStatus === 'PENDING')
          : undefined)

      if (!already) {
        if (next.category === 'CASUALTY') pendingCasualties += 1
        emit(next)
        continue
      }
      // A subject already reviewed is left alone — re-detecting a casualty
      // must never quietly reopen a decision a commander already made.
      if (already.validationStatus !== 'PENDING') continue
      if (item.confidence > already.confidence) {
        // Patch the record that already exists, not the incoming id — merging
        // must update the row the reviewer is looking at.
        patch(already.id, {
          confidence: next.confidence,
          boundingBox: next.boundingBox,
          location: next.location,
          detectedAt: next.detectedAt,
          snapshotUrl: next.snapshotUrl,
        })
      }
    }
  }, [query.data])

  return {
    error: query.error instanceof Error ? query.error.message : null,
    isReachable: !query.error,
    count: query.data?.detections.length ?? 0,
  }
}
