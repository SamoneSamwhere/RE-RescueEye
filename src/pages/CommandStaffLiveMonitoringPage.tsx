import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Radio, ServerCrash, Zap, ZapOff } from 'lucide-react'
import { PageHeader } from '../data/components/layout'
import { Reveal } from '../data/components/landing/Reveal'
import { Panel, EmptyState, Button, LoadingState } from '../data/components/ui'
import { LiveFeedPanel } from '../data/components/media'
import { ResponderExclusionPanel } from '../data/components/command-staff'
import { PossibleCasualtyCard } from '../data/components/detections'
import { useCommandStaffData } from '../features/command-staff'
import { useFeeds, useCloseFeed } from '../features/media/useFeeds'
import { ROUTES } from '../routes/paths'

export function CommandStaffLiveMonitoringPage() {
  const { detections, verifyDetection } = useCommandStaffData()
  const navigate = useNavigate()
  const [detectEnabled, setDetectEnabled] = useState(true)

  const feedsQuery = useFeeds()
  const closeFeed = useCloseFeed()

  // Live drone feeds only. Uploaded clips play in their own section on Drones
  // & Media: a replayed recording on this wall reads as something happening now.
  const feeds = (feedsQuery.data?.feeds ?? []).filter((feed) => feed.kind === 'live')
  // The API suggests a cadence based on how many panels are open, so four
  // feeds don't all hammer /detect at the single-feed rate.
  const intervalMs = feedsQuery.data?.suggestedDetectIntervalMs ?? 350

  // Same card as Detection Review, surfaced here so a casualty spotted on the
  // feed can be actioned without leaving the screen the operator is watching.
  // One card, not a list: the tracker gives every sighting of a subject the
  // same id, so this is one casualty awaiting a decision.
  const pendingCasualty = useMemo(
    () =>
      [...detections]
        .filter((d) => d.category === 'CASUALTY' && d.validationStatus === 'PENDING' && d.confidence >= 0.6)
        .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))[0] ?? null,
    [detections],
  )

  const loadError = feedsQuery.error instanceof Error ? feedsQuery.error.message : null

  return (
    <>
      <PageHeader
        title="Live Monitoring"
        description="Live drone feeds, full-size, with AI detection running over them."
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        {feeds.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-foreground-secondary">
              {feeds.length} live feed{feeds.length === 1 ? '' : 's'} running
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
                icon={Radio}
                title="No live drone feeds right now"
                description="Connect a drone in Drones & Media to see its live feed here. Uploaded recordings play in Drones & Media, not on this screen."
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
                />
              ))}
            </div>
          )}
        </Reveal>

        {/* Incident details sit below all feeds: the feeds are what an operator
            watches, and the casualty awaiting a decision is what they act on next. */}
        {pendingCasualty ? (
          <PossibleCasualtyCard
            detection={pendingCasualty}
            onVerify={(id) => {
              verifyDetection(id, 'MEDIUM', '')
              // Verifying opens an incident; Detection Review is where its
              // priority is set and the follow-up happens, so go there with
              // the casualty already selected.
              navigate(ROUTES.commandStaffDetections, { state: { selectDetectionId: id } })
            }}
          />
        ) : null}

        {/* Sits under the feeds, where an operator looks after seeing a
            detection: it answers "is the system currently ignoring any of my
            own people, and where?" — the one piece of the casualty gate that
            has no other visible trace. */}
        <Reveal>
          <ResponderExclusionPanel />
        </Reveal>
      </div>
    </>
  )
}
