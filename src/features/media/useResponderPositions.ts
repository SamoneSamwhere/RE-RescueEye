/**
 * Publishes our own responders' positions to the Python API.
 *
 * The detector cannot tell a rescuer from a casualty — both are people to it —
 * but the system already knows where the rescuers are, because it draws them
 * on the Damage Map. Sending those positions lets `api/services/casualty.py`
 * veto a "casualty" that is standing exactly where one of our own responders
 * reported in. Without this feed the veto is inert: it is not wrong, it simply
 * never fires.
 *
 * Positions expire server-side (RESPONDER_TTL_S), so this has to keep
 * reporting rather than post once. A stale fix is worse than none — it would
 * go on suppressing casualties at a spot the responder left minutes ago.
 */
import { useEffect, useRef } from 'react'
import { api } from '../../lib/apiClient'

export interface ReportableResponder {
  id: string
  name: string
  currentLocation?: { lat: number; lng: number }
}

/** Comfortably inside the server's 120s TTL, with room for a missed round. */
const REPORT_INTERVAL_MS = 30_000

export function useResponderPositions(responders: ReportableResponder[], enabled = true): void {
  // Held in a ref so a changing array identity does not restart the interval
  // on every render of the provider that owns the responder list.
  const latest = useRef(responders)
  useEffect(() => {
    latest.current = responders
  })

  useEffect(() => {
    if (!enabled) return

    async function report() {
      const payload = latest.current
        .filter((r) => r.currentLocation)
        .map((r) => ({
          id: r.id,
          name: r.name,
          lat: r.currentLocation!.lat,
          lng: r.currentLocation!.lng,
        }))
      if (!payload.length) return
      try {
        await api.post('/responders/positions', { responders: payload })
      } catch {
        // Best-effort: the API being down must not break the console. The
        // consequence is only that the responder veto goes quiet, and the
        // server expires the stale positions on its own.
      }
    }

    void report()
    const timer = setInterval(() => void report(), REPORT_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [enabled])
}
