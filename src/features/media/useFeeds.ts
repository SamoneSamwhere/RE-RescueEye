/**
 * React Query hooks over the API's /stream feed registry, plus the browser-side
 * detection loop that drives Live Monitoring.
 *
 * Detection runs in the browser by design (see the module docstring in
 * api/routers/stream.py): each panel pulls the feed's current frame and posts
 * it to /detect, so adding a panel costs nothing extra server-side.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiUrl, ApiError } from '../../lib/apiClient'
import type { StoredMedia } from '../../types/media'

const FEEDS_KEY = 'feeds'

export interface Feed {
  id: string
  label: string
  kind: 'upload' | 'live' | 'synthetic'
  source: string
  active: boolean
  producer: string
  hasFrame: boolean
}

interface FeedListResponse {
  feeds: Feed[]
  max: number
  count: number
  suggestedDetectIntervalMs: number
}

export interface DetectionBox {
  /**
   * Pixel box in the coordinate space of the frame that was posted — the
   * snapshot, not the displayed panel, so it must be scaled before drawing.
   */
  bbox: { x: number; y: number; w: number; h: number }
  /** 'casualty' (matches DetectionClass.CASUALTY) or a damage class. */
  class: string
  confidence: number
  /** Present once the SORT tracker has a stable id for this subject. */
  track_id?: number
}

interface DetectResponse {
  detections: DetectionBox[]
  inference_time_ms: number
  model_version: string
  brightness: number
  mode: string
  frame_id: string
  /** Size of the frame the API analysed — boxes are in this space. */
  frameWidth?: number
  frameHeight?: number
}

export function useFeeds(pollMs = 4000) {
  return useQuery({
    queryKey: [FEEDS_KEY],
    queryFn: () => api.get<FeedListResponse>('/stream/feeds'),
    refetchInterval: pollMs,
  })
}

/** Opens a stored clip as a feed so it plays on Live Monitoring. */
export function useMonitorMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (mediaId: string) =>
      api.post<{ feed: Feed; mediaId: string; reused: boolean }>(`/media/${mediaId}/monitor`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [FEEDS_KEY] })
    },
  })
}

export function useCloseFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (feedId: string) => api.delete<{ ok: boolean }>(`/stream/feeds/${feedId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [FEEDS_KEY] })
    },
  })
}

export const feedMjpegUrl = (feedId: string) => apiUrl(`/stream/feeds/${feedId}/mjpeg`)
export const feedSnapshotUrl = (feedId: string) => apiUrl(`/stream/feeds/${feedId}/snapshot`)

/** Adds a stored clip to the library list without a refetch round-trip. */
export const mediaLabel = (media: StoredMedia) => media.original_name

export interface DetectionState {
  boxes: DetectionBox[]
  /** Natural size of the frame the boxes were measured against. */
  frameWidth: number
  frameHeight: number
  inferenceMs: number | null
  modelVersion: string | null
  error: string | null
  running: boolean
}

const EMPTY: DetectionState = {
  boxes: [],
  frameWidth: 0,
  frameHeight: 0,
  inferenceMs: null,
  modelVersion: null,
  error: null,
  running: false,
}

/**
 * Polls one feed's current frame and runs detection on it.
 *
 * Cycles are strictly sequential — the next frame is only fetched once the
 * previous /detect has returned. Inference on a 1280px frame takes longer than
 * any sensible interval, so a fixed timer would queue requests faster than the
 * model clears them and the overlay would drift further behind the video.
 */
export function useFeedDetection(feedId: string | null, enabled: boolean, intervalMs = 1500) {
  const [state, setState] = useState<DetectionState>(EMPTY)
  const cancelled = useRef(false)

  useEffect(() => {
    if (!feedId || !enabled) return
    cancelled.current = false

    let timer: number | undefined

    async function cycle() {
      if (cancelled.current || !feedId) return
      try {
        // Detection runs server-side against the feed's own frame: no image
        // crosses the wire in either direction, and the model sees the feed's
        // native frame rather than the downscaled browser preview.
        const result = await api.post<DetectResponse>(`/stream/feeds/${feedId}/detect`)

        if (cancelled.current) return
        setState({
          boxes: result.detections ?? [],
          frameWidth: result.frameWidth ?? 0,
          frameHeight: result.frameHeight ?? 0,
          inferenceMs: result.inference_time_ms ?? null,
          modelVersion: result.model_version ?? null,
          error: null,
          running: true,
        })
      } catch (err) {
        if (cancelled.current) return
        // 503 just means the producer has not emitted a frame yet — that is a
        // normal startup state, not something to surface as an error.
        const starting = err instanceof ApiError && err.status === 503
        if (!starting) {
          setState((s) => ({
            ...s,
            error: err instanceof Error ? err.message : 'Detection failed.',
            running: true,
          }))
        }
      }
      if (!cancelled.current) timer = window.setTimeout(cycle, intervalMs)
    }

    void cycle()
    return () => {
      cancelled.current = true
      if (timer) window.clearTimeout(timer)
    }
  }, [feedId, enabled, intervalMs])

  const reset = useCallback(() => setState(EMPTY), [])
  // Derived rather than cleared in the effect: while the loop is off there is
  // nothing to report, and resetting via setState inside the effect would cost
  // an extra render every time detection is toggled.
  return { ...(enabled && feedId ? state : EMPTY), reset }
}
