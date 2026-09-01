import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MonitorPlay, Sparkles, ArrowRight, ServerCrash, Zap, ZapOff } from 'lucide-react'
import { PageHeader } from '../data/components/layout'
import { Reveal } from '../data/components/landing/Reveal'
import { Panel, EmptyState, Button, LoadingState } from '../data/components/ui'
import { LiveFeedPanel } from '../data/components/media'
import { useCommandStaffData } from '../features/command-staff'
import { useFeeds, useCloseFeed } from '../features/media/useFeeds'
import type { Feed } from '../features/media/useFeeds'
import { ROUTES } from '../routes/paths'

export function CommandStaffLiveMonitoringPage() {
  const { drones, captureMedia } = useCommandStaffData()
  const [detectionCreated, setDetectionCreated] = useState(false)
  const [detectEnabled, setDetectEnabled] = useState(true)

  const feedsQuery = useFeeds()
  const closeFeed = useCloseFeed()

  const feeds = feedsQuery.data?.feeds ?? []
  // The API suggests a cadence based on how many panels are open, so four
  // feeds don't all hammer /detect at the single-feed rate.
  const intervalMs = feedsQuery.data?.suggestedDetectIntervalMs ?? 350

  /** Records the moment as an in-app media asset, as the mock flow always did. */
  function handleSaveToHistory(feed: Feed) {
    const drone = drones.find((d) => feed.label.includes(d.name))
    captureMedia('LIVE_FEED', drone?.id)
    setDetectionCreated(true)
  }

  const loadError = feedsQuery.error instanceof Error ? feedsQuery.error.message : null

  return (
    <>
      <PageHeader
        title="Live Monitoring"
        description="Every feed currently in progress, full-size, with AI detection running over it."
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        {detectionCreated ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-accent-border bg-accent-subtle px-3 py-2 text-sm text-foreground">
            <span className="flex items-center gap-2">
              <Sparkles className="size-4 shrink-0 text-accent" />
              AI processed the new media and produced a detection — pending review.
            </span>
            <Link
              to={ROUTES.commandStaffDetections}
              className="flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              Review it
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : null}

        {feeds.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-foreground-secondary">
              {feeds.length} of {feedsQuery.data?.max ?? 4} feeds running
            </p>
            <Button
              variant={detectEnabled ? 'outline' : 'secondary'}
              size="sm"
              onClick={() => setDetectEnabled((on) => !on)}
            >
              {detectEnabled ? <Zap className="size-3.5" /> : <ZapOff className="size-3.5" />}
              {detectEnabled ? 'AI detection on' : 'AI detection off'}
            </Button>
          </div>
        ) : null}

        <Reveal>
          {feedsQuery.isLoading ? (
            <Panel title="Live Feeds">
              <LoadingState label="Looking for running feeds…" />
            </Panel>
          ) : loadError ? (
            <Panel title="Live Feeds">
              <EmptyState
                icon={ServerCrash}
                title="Could not reach the detection API"
                description={loadError}
                action={
                  <Button variant="outline" size="sm" onClick={() => void feedsQuery.refetch()}>
                    Retry
                  </Button>
                }
              />
            </Panel>
          ) : feeds.length === 0 ? (
            <Panel title="Live Feeds">
              <EmptyState
                icon={MonitorPlay}
                title="No feeds running right now"
                description="Upload recorded footage in Drones & Media and choose Monitor to watch it here with AI detection."
                action={
                  <Link to={ROUTES.commandStaffMedia}>
                    <Button size="sm">Go to Drones & Media</Button>
                  </Link>
                }
              />
            </Panel>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {feeds.map((feed) => (
                <LiveFeedPanel
                  key={feed.id}
                  feed={feed}
                  detectEnabled={detectEnabled}
                  intervalMs={intervalMs}
                  onClose={(id) => closeFeed.mutate(id)}
                  onSaveToHistory={handleSaveToHistory}
                />
              ))}
            </div>
          )}
        </Reveal>
      </div>
    </>
  )
}
