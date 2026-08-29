import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'
import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { DroneList } from '../components/drones'
import { FeedModal, MediaHistoryTable } from '../components/media'
import type { MediaHistoryItem } from '../components/media'
import { useAuth } from '../features/auth'
import { useCommandStaffData } from '../features/command-staff'
import { mockUsers } from '../data/mockUsers'
import { ROUTES } from '../routes/paths'
import type { MediaSourceType } from '../types/media'

const CONNECT_DELAY_MS = 800

export function CommandStaffDronesMediaPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { drones, liveDroneIds, mediaAssets, connectDrone, startLiveFeed, captureMedia } =
    useCommandStaffData()
  const [connectingDroneId, setConnectingDroneId] = useState<string | null>(null)
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null)
  const [feedSource, setFeedSource] = useState<MediaSourceType | null>(null)
  const [detectionCreated, setDetectionCreated] = useState(false)

  const selectedDrone = drones.find((d) => d.id === selectedDroneId) ?? null

  function handleConnect(droneId: string) {
    setConnectingDroneId(droneId)
    window.setTimeout(() => {
      connectDrone(droneId)
      setConnectingDroneId(null)
    }, CONNECT_DELAY_MS)
  }

  function handleSelectFeedSource(droneId: string) {
    setSelectedDroneId(droneId)
    setFeedSource(null)
    setDetectionCreated(false)
  }

  function handleCloseFeedModal() {
    setSelectedDroneId(null)
    setFeedSource(null)
  }

  /** Hands the feed off to the dedicated Live Monitoring screen instead of streaming it inline. */
  function handleStartLiveFeed() {
    if (!selectedDrone) return
    startLiveFeed(selectedDrone.id)
    handleCloseFeedModal()
    navigate(ROUTES.commandStaffLiveMonitoring)
  }

  /** Uploaded video -> mock AI Detection, ready for Detection Review. */
  function handleUploadVideo(fileName: string) {
    if (!selectedDrone) return
    captureMedia('UPLOADED_VIDEO', selectedDrone.id, fileName)
    setDetectionCreated(true)
    handleCloseFeedModal()
  }

  const mediaHistoryItems: MediaHistoryItem[] = useMemo(() => {
    return [...mediaAssets]
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
      .map((asset) => {
        const drone = asset.droneId ? drones.find((d) => d.id === asset.droneId) : undefined
        const uploader = asset.uploadedByUserId ? mockUsers.find((u) => u.id === asset.uploadedByUserId) : undefined
        return {
          id: asset.id,
          sourceType: asset.sourceType,
          droneName: drone?.name,
          uploadedByName: uploader?.name,
          capturedAt: asset.capturedAt,
        }
      })
  }, [mediaAssets, drones])

  if (!session) return null

  return (
    <>
      <PageHeader
        title="Drones & Media"
        description="Register drones, connect them, and bring in live feeds or recorded footage."
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal>
          <DroneList
            drones={drones}
            connectingDroneId={connectingDroneId}
            liveDroneIds={liveDroneIds}
            onConnect={handleConnect}
            onSelectFeedSource={handleSelectFeedSource}
            onViewLive={() => navigate(ROUTES.commandStaffLiveMonitoring)}
            onRegisterClick={() => navigate(ROUTES.commandStaffDroneRegistration)}
          />
        </Reveal>

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

        <Reveal delayMs={100}>
          <MediaHistoryTable items={mediaHistoryItems} />
        </Reveal>
      </div>

      {selectedDrone ? (
        <FeedModal
          open={!!selectedDrone}
          onClose={handleCloseFeedModal}
          droneName={selectedDrone.name}
          isConnected={selectedDrone.connectionStatus === 'CONNECTED'}
          feedSource={feedSource}
          onSelectFeedSource={setFeedSource}
          onStartLiveFeed={handleStartLiveFeed}
          onUploadVideo={handleUploadVideo}
        />
      ) : null}
    </>
  )
}
