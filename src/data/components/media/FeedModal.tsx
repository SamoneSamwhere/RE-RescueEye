import { Radio } from 'lucide-react'
import { Modal, StatusIndicator, Panel, Button } from '../ui'
import { FeedSourceSelector } from './FeedSourceSelector'
import { UploadVideoPanel } from './UploadVideoPanel'
import type { MediaSourceType } from '../../../types/media'

interface FeedModalProps {
  open: boolean
  onClose: () => void
  droneName: string
  isConnected: boolean
  feedSource: MediaSourceType | null
  onSelectFeedSource: (source: MediaSourceType) => void
  onStartLiveFeed: () => void
  /** Receives the actual File so it can be sent to the media library. */
  onUploadVideo: (file: File) => void
  uploading: boolean
  uploadProgress: number
  uploadError: string | null
  onCancelUpload?: () => void
}

/**
 * Overlays the existing feed-source flow (FeedSourceSelector + upload
 * placeholder) in a modal, rather than duplicating it. A live feed isn't
 * streamed inline here — starting one closes this modal and hands off to
 * the dedicated Live Monitoring screen, where it can be watched full-size
 * alongside any other feeds already in progress.
 */
export function FeedModal({
  open,
  onClose,
  droneName,
  isConnected,
  feedSource,
  onSelectFeedSource,
  onStartLiveFeed,
  onUploadVideo,
  uploading,
  uploadProgress,
  uploadError,
  onCancelUpload,
}: FeedModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={droneName}
      className="max-w-2xl !border-border-strong !bg-surface-secondary"
    >
      <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
        <StatusIndicator tone={isConnected ? 'success' : 'neutral'} label={isConnected ? 'Online' : 'Offline'} />

        <FeedSourceSelector droneName={droneName} selected={feedSource} onSelect={onSelectFeedSource} />

        {feedSource === 'LIVE_FEED' ? (
          <Panel title="Live Feed">
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <Radio className="size-8 text-accent" />
              <p className="text-sm text-foreground-secondary">
                This feed opens on the Live Monitoring screen, where it stays full-size alongside any other active
                feeds.
              </p>
              <Button onClick={onStartLiveFeed}>Start Feed</Button>
            </div>
          </Panel>
        ) : null}

        {feedSource === 'UPLOADED_VIDEO' ? (
          <UploadVideoPanel
            droneName={droneName}
            uploading={uploading}
            progress={uploadProgress}
            error={uploadError}
            onUpload={onUploadVideo}
            onCancel={onCancelUpload}
          />
        ) : null}
      </div>
    </Modal>
  )
}
