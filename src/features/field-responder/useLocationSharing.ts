import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/apiClient'
import type { GeoPoint } from '../../types/geo'

export type LocationSharingStatus = 'requesting' | 'sharing' | 'denied' | 'unavailable' | 'unsupported'

export interface LocationSharingState {
  status: LocationSharingStatus
  /** Latest fix from this device; null until the first one arrives. */
  position: GeoPoint | null
  /** When that fix was taken (epoch ms); null until the first one arrives. */
  updatedAt: number | null
}

/** How each status reads on the responder's screens. */
export const LOCATION_STATUS_DISPLAY = {
  requesting: { tone: 'warning', label: 'Waiting for GPS' },
  sharing: { tone: 'success', label: 'Sharing' },
  denied: { tone: 'danger', label: 'Permission denied' },
  unavailable: { tone: 'warning', label: 'GPS unavailable' },
  unsupported: { tone: 'danger', label: 'Not supported' },
} as const satisfies Record<LocationSharingStatus, { tone: string; label: string }>

/** How often the latest fix is sent to the API, which pushes it to the Damage Map. */
const SEND_INTERVAL_MS = 5_000

/**
 * Shares this Field Responder's GPS position while they are logged in.
 *
 * The browser's watchPosition keeps the latest fix current; a fixed interval
 * sends it, so a responder standing still is still reported (the API expires
 * positions it has not heard about recently) and a fast-moving one does not
 * flood the API with every fix.
 */
export function useLocationSharing(responder: { id: string; name: string } | null): LocationSharingState {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator
  const [state, setState] = useState<LocationSharingState>({
    status: supported ? 'requesting' : 'unsupported',
    position: null,
    updatedAt: null,
  })
  const latest = useRef<GeoPoint | null>(null)

  const responderId = responder?.id
  const responderName = responder?.name ?? ''

  useEffect(() => {
    if (!responderId || !supported) return

    const watchId = navigator.geolocation.watchPosition(
      ({ coords, timestamp }) => {
        const position = { lat: coords.latitude, lng: coords.longitude }
        latest.current = position
        setState({ status: 'sharing', position, updatedAt: timestamp })
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
        }))
      },
      { enableHighAccuracy: true, maximumAge: SEND_INTERVAL_MS, timeout: 20_000 },
    )

    const timer = setInterval(() => {
      const position = latest.current
      if (!position) return
      api
        .post(`/responders/${encodeURIComponent(responderId)}/location`, { ...position, name: responderName })
        .catch(() => {
          // Best-effort: a missed report is replaced by the next one 5s later.
        })
    }, SEND_INTERVAL_MS)

    return () => {
      navigator.geolocation.clearWatch(watchId)
      clearInterval(timer)
    }
  }, [responderId, responderName, supported])

  return state
}
