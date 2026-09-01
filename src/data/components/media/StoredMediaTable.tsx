import { Archive, Camera, Film, MonitorPlay, Play, RefreshCw, ServerCrash } from 'lucide-react'
import {
  Panel,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  EmptyState,
  LoadingState,
} from '../ui'
import { formatDateTime } from '../../lib/formatDateTime'
import { mediaThumbnailUrl } from '../../features/media'
import type { StoredMedia } from '../../types/media'

export interface StoredMediaTableProps {
  items: StoredMedia[]
  loading: boolean
  error: string | null
  droneNameById: (droneId: string | null) => string | undefined
  onReview: (media: StoredMedia) => void
  onMonitor: (media: StoredMedia) => void
  monitoringId: string | null
  onRetry: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const s = Math.floor(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Stored footage held by the API, as opposed to MediaHistoryTable which lists
 * the mock in-app media assets. Every row here is a real file on disk that can
 * be played back and captured from.
 */
export function StoredMediaTable({
  items,
  loading,
  error,
  droneNameById,
  onReview,
  onMonitor,
  monitoringId,
  onRetry,
}: StoredMediaTableProps) {
  return (
    <Panel title="Media Storage & History">
      {loading ? (
        <LoadingState label="Loading stored media…" />
      ) : error ? (
        <EmptyState
          icon={ServerCrash}
          title="Could not load stored media"
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="size-3.5" />
              Retry
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="No media stored yet"
          description="Upload recorded drone footage to keep it here for later review."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clip</TableHead>
              <TableHead>Drone</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Frames</TableHead>
              <TableHead>Stored</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <img
                      src={mediaThumbnailUrl(item.id)}
                      alt=""
                      loading="lazy"
                      className="h-9 w-16 shrink-0 rounded border border-border bg-black object-cover"
                      // A clip whose poster frame can't be generated still has
                      // a usable row; drop the broken-image icon instead.
                      onError={(e) => {
                        e.currentTarget.style.visibility = 'hidden'
                      }}
                    />
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Film className="size-3.5 shrink-0 text-foreground-muted" />
                      <span className="truncate text-sm text-foreground">{item.original_name}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-foreground-secondary">
                  {droneNameById(item.drone_id) ?? '—'}
                </TableCell>
                <TableCell className="text-foreground-secondary">{item.uploaded_by_name ?? '—'}</TableCell>
                <TableCell className="text-foreground-secondary tabular-nums">
                  {formatDuration(item.duration_sec)}
                </TableCell>
                <TableCell className="text-foreground-secondary tabular-nums">
                  {formatBytes(item.size_bytes)}
                </TableCell>
                <TableCell>
                  {item.frame_count > 0 ? (
                    <Badge tone="info">
                      <span className="mr-1 inline-flex">
                        <Camera className="size-3" />
                      </span>
                      {item.frame_count}
                    </Badge>
                  ) : (
                    <span className="text-foreground-muted">—</span>
                  )}
                </TableCell>
                <TableCell className="text-foreground-secondary">{formatDateTime(item.uploaded_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={monitoringId === item.id}
                      onClick={() => onMonitor(item)}
                    >
                      <MonitorPlay className="size-3.5" />
                      {monitoringId === item.id ? 'Opening…' : 'Monitor'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onReview(item)}>
                      <Play className="size-3.5" />
                      Review
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}
