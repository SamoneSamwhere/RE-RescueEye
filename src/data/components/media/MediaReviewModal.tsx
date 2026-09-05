import { useRef, useState } from 'react'
import { Camera, Clock, Download, HardDrive, Monitor, Trash2, User } from 'lucide-react'
import { Modal, Button, Panel, EmptyState, Badge } from '../ui'
import { formatDateTime } from '../../../lib/formatDateTime'
import { mediaFileUrl, mediaFrameUrl } from '../../../features/media'
import type { StoredMedia } from '../../../types/media'

export interface MediaReviewModalProps {
  media: StoredMedia | null
  open: boolean
  onClose: () => void
  onCaptureFrame: (tSec: number) => void
  onDelete: (mediaId: string) => void
  capturing: boolean
  deleting: boolean
  error: string | null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Plays a stored clip back for review and captures stills from it.
 *
 * The frame is extracted server-side from the original file rather than from
 * the <video> element: the element is showing a downscaled, decoded preview,
 * so a canvas grab would save a lower-quality image than the source. Sending
 * the timestamp keeps captured stills at full recording resolution.
 */
export function MediaReviewModal({
  media,
  open,
  onClose,
  onCaptureFrame,
  onDelete,
  capturing,
  deleting,
  error,
}: MediaReviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!media) return null

  function handleCapture() {
    onCaptureFrame(videoRef.current?.currentTime ?? 0)
  }

  const dimensions = media.width && media.height ? `${media.width}×${media.height}` : '—'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={media.original_name}
      className="max-w-4xl !border-border-strong !bg-surface-secondary"
    >
      <div className="flex max-h-[78vh] flex-col gap-4 overflow-y-auto">
        <video
          ref={videoRef}
          key={media.id}
          src={mediaFileUrl(media.id)}
          controls
          preload="metadata"
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          className="w-full rounded-md border border-border bg-black"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleCapture} disabled={capturing}>
            <Camera className="size-3.5" />
            {capturing ? 'Capturing…' : `Capture frame at ${formatClock(currentTime)}`}
          </Button>
          <a href={mediaFileUrl(media.id)} download={media.original_name}>
            <Button variant="outline" size="md">
              <Download className="size-3.5" />
              Download
            </Button>
          </a>
          {confirmDelete ? (
            <>
              <Button variant="danger" size="md" disabled={deleting} onClick={() => onDelete(media.id)}>
                {deleting ? 'Deleting…' : 'Confirm delete'}
              </Button>
              <Button variant="ghost" size="md" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="md" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          )}
        </div>

        {error ? <p className="text-xs text-danger">{error}</p> : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Meta icon={Clock} label="Duration" value={media.duration_sec ? `${media.duration_sec}s` : '—'} />
          <Meta icon={Monitor} label="Resolution" value={dimensions} />
          <Meta icon={HardDrive} label="Size" value={formatBytes(media.size_bytes)} />
          <Meta icon={User} label="Uploaded by" value={media.uploaded_by_name ?? '—'} />
        </div>

        <Panel title={`Captured Frames (${media.frames.length})`}>
          {media.frames.length === 0 ? (
            <EmptyState icon={Camera} title="No frames captured yet" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {media.frames.map((frame) => (
                <figure key={frame.id} className="flex flex-col gap-1">
                  <img
                    src={mediaFrameUrl(media.id, frame.id)}
                    alt={`Frame at ${formatClock(frame.t_sec)}`}
                    loading="lazy"
                    className="aspect-video w-full rounded-md border border-border object-cover"
                  />
                  <figcaption className="flex items-center justify-between gap-2 text-xs text-foreground-muted">
                    <Badge tone="neutral">{formatClock(frame.t_sec)}</Badge>
                    <span className="truncate">{formatDateTime(frame.captured_at)}</span>
                  </figcaption>
                  {frame.note ? (
                    <p className="truncate text-xs text-foreground-secondary">{frame.note}</p>
                  ) : null}
                </figure>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </Modal>
  )
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border border-border bg-surface px-2.5 py-2">
      <p className="flex items-center gap-1.5 text-xs text-foreground-muted">
        <Icon className="size-3" />
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm text-foreground">{value}</p>
    </div>
  )
}
