import { Radio } from 'lucide-react'
import { Modal, StatusIndicator, Panel, Button } from '../ui'
import { FeedSourceSelector } from './FeedSourceSelector'
import { UploadVideoPlaceholder } from './UploadVideoPlaceholder'
import type { MediaSourceType } from '../../types/media'

interface FeedModalProps {
  open: boolean
  onClose: () => void
  droneName: string
  isConnected: boolean
  feedSource: MediaSourceType | null
  onSelectFeedSource: (source: MediaSourceType) => void
  onStartLiveFeed: () => void
  onUploadVideo: (fileName: string) => void
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
          <UploadVideoPlaceholder droneName={droneName} onUpload={onUploadVideo} />
        ) : null}
      </div>
    </Modal>
  )
}
