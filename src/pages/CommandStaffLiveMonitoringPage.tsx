import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MonitorPlay, Sparkles, ArrowRight } from 'lucide-react'
import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { Panel, EmptyState, Button } from '../components/ui'
import { LiveFeedPlaceholder } from '../components/media'
import { useCommandStaffData } from '../features/command-staff'
import { ROUTES } from '../routes/paths'

export function CommandStaffLiveMonitoringPage() {
  const { drones, liveDroneIds, stopLiveFeed, captureMedia } = useCommandStaffData()
  const [detectionCreated, setDetectionCreated] = useState(false)

  const liveDrones = useMemo(
    () =>
      liveDroneIds
        .map((droneId) => drones.find((d) => d.id === droneId))
        .filter((drone): drone is NonNullable<typeof drone> => !!drone),
    [liveDroneIds, drones],
  )

  /** Live Feed frame -> mock AI Detection, ready for Detection Review. */
  function handleSaveToHistory(droneId: string) {
    captureMedia('LIVE_FEED', droneId)
    setDetectionCreated(true)
  }

  return (
    <>
      <PageHeader
        title="Live Monitoring"
        description="Every drone feed currently in progress, full-size, in one place."
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

        <Reveal>
          {liveDrones.length === 0 ? (
            <Panel title="Live Feeds">
              <EmptyState
                icon={MonitorPlay}
                title="No live feeds right now"
                description="Start a feed from Drones & Media to watch it here, full-size."
                action={
                  <Link to={ROUTES.commandStaffMedia}>
                    <Button size="sm">Go to Drones & Media</Button>
                  </Link>
                }
              />
            </Panel>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {liveDrones.map((drone) => (
                <LiveFeedPlaceholder
                  key={drone.id}
                  title={drone.name}
                  droneName={drone.name}
                  isLive
                  onToggleLive={() => stopLiveFeed(drone.id)}
                  onSaveToHistory={() => handleSaveToHistory(drone.id)}
                />
              ))}
            </div>
          )}
        </Reveal>
      </div>
    </>
  )
}
