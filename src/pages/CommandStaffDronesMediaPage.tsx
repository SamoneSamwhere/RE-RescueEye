import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { DroneList, RegisterDroneModal } from '../components/drones'
import { FeedModal, StoredMediaTable, MediaReviewModal } from '../components/media'
import { useAuth } from '../features/auth'
import { useCommandStaffData } from '../features/command-staff'
import {
  useMediaLibrary,
  useUploadMedia,
  useCaptureFrame,
  useDeleteMedia,
} from '../features/media'
import { useMonitorMedia } from '../features/media/useFeeds'
import { ROUTES } from '../routes/paths'
import type { MediaSourceType, StoredMedia } from '../types/media'

const CONNECT_DELAY_MS = 800

export function CommandStaffDronesMediaPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { drones, liveDroneIds, registerDrone, connectDrone, startLiveFeed, captureMedia } =
    useCommandStaffData()

  const agencyId = session?.agencyId

  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [connectingDroneId, setConnectingDroneId] = useState<string | null>(null)
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null)
  const [feedSource, setFeedSource] = useState<MediaSourceType | null>(null)
  const [detectionCreated, setDetectionCreated] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const library = useMediaLibrary(agencyId)
  const upload = useUploadMedia()
  const captureFrame = useCaptureFrame()
  const deleteMedia = useDeleteMedia()
  const monitorMedia = useMonitorMedia()

  // Memoised so the `reviewing` lookup below has a stable dependency; a bare
  // `?? []` would allocate a new array on every render.
  const storedMedia = useMemo(() => library.data?.items ?? [], [library.data])
  const selectedDrone = drones.find((d) => d.id === selectedDroneId) ?? null

  // Re-read from the freshly fetched list rather than holding the object, so
  // the modal shows a newly captured frame as soon as the query is invalidated.
  const reviewing = useMemo(
    () => storedMedia.find((m) => m.id === reviewingId) ?? null,
    [storedMedia, reviewingId],
  )

  const droneNameById = useCallback(
    (droneId: string | null) => (droneId ? drones.find((d) => d.id === droneId)?.name : undefined),
    [drones],
  )

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
    setUploadedName(null)
    upload.reset()
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

  /**
   * Real upload: the file is stored by the API's media library first, and only
   * once that succeeds is the in-app Detection created. Doing it in that order
   * means a failed upload never leaves a detection pointing at footage that was
   * never stored.
   */
  function handleUploadVideo(file: File) {
    if (!selectedDrone) return
    upload.mutate(
      {
        file,
        agencyId,
        droneId: selectedDrone.id,
        uploadedBy: session?.id,
        uploadedByName: session?.name,
      },
      {
        onSuccess: (stored) => {
          captureMedia('UPLOADED_VIDEO', selectedDrone.id, stored.original_name)
          setUploadedName(stored.original_name)
          setDetectionCreated(true)
          handleCloseFeedModal()
          // Open it as a feed straight away and hand off to Live Monitoring —
          // an uploaded clip is only useful once the AI is running on it.
          monitorMedia.mutate(stored.id, {
            onSuccess: () => navigate(ROUTES.commandStaffLiveMonitoring),
          })
        },
      },
    )
  }

  function handleMonitor(media: StoredMedia) {
    monitorMedia.mutate(media.id, {
      onSuccess: () => navigate(ROUTES.commandStaffLiveMonitoring),
    })
  }

  function handleCaptureFrame(tSec: number) {
    if (!reviewing) return
    captureFrame.mutate({ mediaId: reviewing.id, tSec })
  }

  function handleDeleteMedia(mediaId: string) {
    deleteMedia.mutate(mediaId, { onSuccess: () => setReviewingId(null) })
  }

  if (!session) return null

  const uploadError = upload.error instanceof Error ? upload.error.message : null
  const libraryError = library.error instanceof Error ? library.error.message : null
  const reviewError =
    captureFrame.error instanceof Error
      ? captureFrame.error.message
      : deleteMedia.error instanceof Error
        ? deleteMedia.error.message
        : null

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
            onRegisterClick={() => setRegisterModalOpen(true)}
          />
        </Reveal>

        {monitorMedia.error instanceof Error ? (
          <p className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg">
            {monitorMedia.error.message}
          </p>
        ) : null}

        {uploadedName ? (
          <div className="flex items-center gap-2 rounded-md border border-success-border bg-success-bg px-3 py-2 text-sm text-success-fg">
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="truncate">{uploadedName} was uploaded and stored for later review.</span>
          </div>
        ) : null}

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
          <StoredMediaTable
            items={storedMedia}
            loading={library.isLoading}
            error={libraryError}
            droneNameById={droneNameById}
            onReview={(media: StoredMedia) => setReviewingId(media.id)}
            onMonitor={handleMonitor}
            monitoringId={monitorMedia.isPending ? (monitorMedia.variables ?? null) : null}
            onRetry={() => void library.refetch()}
          />
        </Reveal>
      </div>

      <RegisterDroneModal
        open={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onRegister={registerDrone}
        existingSerialNumbers={drones.map((d) => d.serialNumber)}
      />

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
          uploading={upload.isPending}
          uploadProgress={upload.progress}
          uploadError={uploadError}
          onCancelUpload={upload.abort ?? undefined}
        />
      ) : null}

      <MediaReviewModal
        media={reviewing}
        open={!!reviewing}
        onClose={() => setReviewingId(null)}
        onCaptureFrame={handleCaptureFrame}
        onDelete={handleDeleteMedia}
        capturing={captureFrame.isPending}
        deleting={deleteMedia.isPending}
        error={reviewError}
      />
    </>
  )
}
