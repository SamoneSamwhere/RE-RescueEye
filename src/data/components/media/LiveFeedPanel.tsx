import { useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, Scan, X, Zap } from 'lucide-react'
import { Panel, Button, Badge } from '../ui'
import { cn } from '../../../lib/cn'
import { feedMjpegUrl, useFeedDetection } from '../../features/media/useFeeds'
import type { Feed } from '../../features/media/useFeeds'

export interface LiveFeedPanelProps {
  feed: Feed
  detectEnabled: boolean
  onClose: (feedId: string) => void
  onSaveToHistory?: (feed: Feed) => void
  intervalMs?: number
}

/** A looping feed drops its connection between passes; don't give up on the first blip. */
const MAX_STREAM_RETRIES = 5
const STREAM_RETRY_MS = 1200

const BOX_COLORS: Record<string, string> = {
  casualty: '#ff3b3b',
  fire_damage: '#ff7700',
  flood_damage: '#00d4ff',
  structural_damage: '#f97316',
}

/**
 * One monitoring panel: the feed's MJPEG stream with AI detections drawn over it.
 *
 * Boxes are absolutely-positioned in percentages rather than pixels, so they
 * stay aligned when the panel is resized. The API reports boxes against the
 * snapshot it analysed, which is a different size from the rendered <img>, so
 * every coordinate is normalised by the frame dimensions first.
 */
export function LiveFeedPanel({
  feed,
  detectEnabled,
  onClose,
  onSaveToHistory,
  intervalMs = 350,
}: LiveFeedPanelProps) {
  const detection = useFeedDetection(feed.id, detectEnabled, intervalMs)
  const [attempt, setAttempt] = useState(0)
  const [streamFailed, setStreamFailed] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const tearingDown = useRef(false)
  const retryTimer = useRef<number | undefined>(undefined)

  const streamSrc = `${feedMjpegUrl(feed.id)}?a=${attempt}`

  /**
   * `src` is driven here rather than through JSX on purpose.
   *
   * An MJPEG response never completes, so the browser holds the connection
   * open for as long as the element has that src — clearing it is what
   * actually closes the socket and releases the FFmpeg reader. But clearing a
   * JSX-managed src desyncs React: on StrictMode's dev remount the prop is
   * unchanged, so React never restores it and the panel stays blank. Owning
   * the attribute in the effect keeps mount/cleanup/remount symmetrical.
   */
  useEffect(() => {
    const node = imgRef.current
    if (!node) return
    tearingDown.current = false
    node.src = streamSrc
    return () => {
      tearingDown.current = true
      node.src = ''
    }
  }, [streamSrc])

  useEffect(() => () => window.clearTimeout(retryTimer.current), [])

  /**
   * A stream error is usually transient — the feed restarts when its source
   * loops, which drops the connection. Retry a few times before declaring the
   * panel dead, and ignore the error our own teardown provokes.
   */
  function handleStreamError() {
    if (tearingDown.current) return
    if (attempt < MAX_STREAM_RETRIES) {
      retryTimer.current = window.setTimeout(() => setAttempt((a) => a + 1), STREAM_RETRY_MS)
    } else {
      setStreamFailed(true)
    }
  }

  const { boxes, frameWidth, frameHeight } = detection
  const canScale = frameWidth > 0 && frameHeight > 0

  return (
    <Panel title={feed.label}>
      <div className="flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-md border border-border bg-surface-inverse">
          {streamFailed ? (
            <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
              <Scan className="size-8 text-foreground-muted" />
              <p className="text-sm text-foreground-inverse/80">Stream unavailable</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStreamFailed(false)
                  setAttempt((a) => a + 1)
                }}
              >
                <RefreshCw className="size-3.5" />
                Retry stream
              </Button>
            </div>
          ) : (
            <img
              ref={imgRef}
              alt={`Live feed from ${feed.label}`}
              onError={handleStreamError}
              className="block w-full"
            />
          )}

          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-sm bg-danger px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-foreground-inverse">
            <span className="size-1.5 animate-pulse rounded-full bg-foreground-inverse" />
            Live
          </span>

          {detectEnabled ? (
            <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-sm bg-black/65 px-2 py-0.5 text-xs font-medium text-white">
              <Zap className="size-3 text-accent" />
              {detection.error
                ? 'AI error'
                : detection.inferenceMs != null
                  ? `${boxes.length} detected · ${Math.round(detection.inferenceMs)}ms`
                  : 'Analysing…'}
            </span>
          ) : null}

          {/* Detection overlay */}
          {canScale
            ? boxes.map((box, i) => {
                const color = BOX_COLORS[box.class] ?? '#ffffff'
                return (
                  <div
                    key={box.track_id ?? `${box.bbox.x}-${box.bbox.y}-${i}`}
                    className="pointer-events-none absolute"
                    style={{
                      left: `${(box.bbox.x / frameWidth) * 100}%`,
                      top: `${(box.bbox.y / frameHeight) * 100}%`,
                      width: `${(box.bbox.w / frameWidth) * 100}%`,
                      height: `${(box.bbox.h / frameHeight) * 100}%`,
                      border: `2px solid ${color}`,
                      boxShadow: `0 0 0 1px rgba(0,0,0,.45)`,
                      // Detections arrive in discrete steps; easing between
                      // them reads as tracking rather than teleporting. Keyed
                      // on the SORT track id, so the same subject keeps the
                      // same DOM node for the transition to animate.
                      transition: 'left 200ms linear, top 200ms linear, width 200ms linear, height 200ms linear',
                    }}
                  >
                    <span
                      className="absolute -top-5 left-0 whitespace-nowrap px-1 text-[10px] font-semibold"
                      style={{ background: color, color: '#0a0e1a' }}
                    >
                      {box.class.replace('_', ' ').toUpperCase()} {Math.round(box.confidence * 100)}%
                      {box.track_id != null ? ` #${box.track_id}` : ''}
                    </span>
                  </div>
                )
              })
            : null}
        </div>

        {detection.error ? <p className="text-xs text-danger">{detection.error}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="danger" size="md" onClick={() => onClose(feed.id)}>
            <X className="size-3.5" />
            Stop Feed
          </Button>
          {onSaveToHistory ? (
            <Button variant="outline" size="md" onClick={() => onSaveToHistory(feed)}>
              <Camera className="size-3.5" />
              Save to Media History
            </Button>
          ) : null}
          <Badge tone={feed.kind === 'upload' ? 'neutral' : 'info'}>
            {feed.kind === 'upload' ? 'Recorded' : feed.kind === 'live' ? 'Live source' : 'Synthetic'}
          </Badge>
          {detection.modelVersion ? (
            <span className={cn('text-xs', detection.modelVersion === 'custom_v1' ? 'text-foreground-muted' : 'text-warning')}>
              model: {detection.modelVersion}
            </span>
          ) : null}
        </div>
      </div>
    </Panel>
  )
}
