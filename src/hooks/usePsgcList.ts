import { useEffect, useState } from 'react'
import { sortByName } from '../lib/psgc'

export type PsgcListState<T> =
  | { status: 'idle'; items: T[]; error: null }
  | { status: 'loading'; items: T[]; error: null }
  | { status: 'error'; items: T[]; error: string }
  | { status: 'ready'; items: T[]; error: null }

/**
 * Fetches one PSGC level (regions, or one parent's provinces/cities/barangays),
 * alphabetized and with loading/error state a cascading <select> can react to.
 *
 * `key` is null when this level has no parent selected yet — the fetch (and
 * any previous result) is skipped so a stale list can't be shown as if it
 * belonged to the new parent. Whenever `key` changes, retryToken resets and
 * a fresh request runs; calling `retry()` reruns it without a key change.
 */
export function usePsgcList<T extends { name: string }>(
  key: string | null,
  fetcher: () => Promise<T[]>,
): PsgcListState<T> & { retry: () => void } {
  const [state, setState] = useState<PsgcListState<T>>({ status: 'idle', items: [], error: null })
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (key == null) {
      setState({ status: 'idle', items: [], error: null })
      return
    }
    let cancelled = false
    setState({ status: 'loading', items: [], error: null })
    fetcher()
      .then((items) => {
        if (cancelled) return
        setState({ status: 'ready', items: sortByName(items), error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          items: [],
          error: err instanceof Error ? err.message : 'Failed to load locations.',
        })
      })
    return () => {
      cancelled = true
    }
    // `fetcher` is a small closure derived entirely from `key`; only `key` (and
    // an explicit retry) should trigger a new request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, retryToken])

  return { ...state, retry: () => setRetryToken((n) => n + 1) }
}
