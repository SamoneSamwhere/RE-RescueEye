import { forwardRef, useState } from 'react'
import { Film, Zap, ZapOff } from 'lucide-react'
import { Button, EmptyState, Panel } from '../ui'
import { LiveFeedPanel } from './LiveFeedPanel'
import { useCloseFeed, useFeeds } from '../../../features/media/useFeeds'

/**
 * Uploaded (recorded) clips being played back with AI detection — kept apart
 * from Live Monitoring, which shows live drone feeds only. A recording is
 * review work; mixing it into the live wall made a replayed clip look like
 * something happening now.
 *
 * Forwarded ref so the page can scroll here when the operator starts
 * monitoring a clip.
 */
export const UploadedFeedsSection = forwardRef<HTMLDivElement>(function UploadedFeedsSection(_props, ref) {
  const feedsQuery = useFeeds()
  const closeFeed = useCloseFeed()
  const [detectEnabled, setDetectEnabled] = useState(true)

  const uploaded = (feedsQuery.data?.feeds ?? []).filter((feed) => feed.kind !== 'live')
  const intervalMs = feedsQuery.data?.suggestedDetectIntervalMs ?? 350

  return (
    <div ref={ref} className="scroll-mt-4">
      <Panel
        title={`Uploaded Feeds (${uploaded.length})`}
        actions={
          uploaded.length > 0 ? (
            <Button variant={detectEnabled ? 'outline' : 'secondary'} size="sm" onClick={() => setDetectEnabled((on) => !on)}>
              {detectEnabled ? <Zap className="size-3.5" /> : <ZapOff className="size-3.5" />}
              {detectEnabled ? 'AI detection on' : 'AI detection off'}
            </Button>
          ) : null
        }
      >
        {uploaded.length === 0 ? (
          <EmptyState
            icon={Film}
            title="No uploaded feeds playing"
            description="Choose Monitor on a clip in the media library below to play it here with AI detection."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {uploaded.map((feed) => (
              <LiveFeedPanel
                key={feed.id}
                feed={feed}
                detectEnabled={detectEnabled}
                intervalMs={intervalMs}
                onClose={(id) => closeFeed.mutate(id)}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
})
