import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, CheckCircle2, Plus, Wifi } from 'lucide-react'
import { PageHeader } from '../data/components/layout'
import { Reveal } from '../data/components/landing/Reveal'
import { DroneList } from '../data/components/drones'
import { Button } from '../data/components/ui'
import {
  FeedModal,
  StoredMediaTable,
  MediaReviewModal,
  AddVideoModal,
  ConnectDroneModal,
  MediaFilterBar,
  EMPTY_MEDIA_FILTERS,
  hasActiveFilters,
} from '../data/components/media'
import { UploadedFeedsSection } from '../data/components/media/UploadedFeedsSection'
import type { MediaFilters } from '../data/components/media'
import { useAuth } from '../features/auth'
import { useCommandStaffData } from '../features/command-staff'
import { mockUsers } from '../data/mockUsers'
import {
  useMediaLibrary,
  useUploadMedia,
  useCaptureFrame,
  useDeleteMedia,
} from '../features/media'
import { useAddFeed, useMonitorMedia } from '../features/media/useFeeds'
import { ROUTES } from '../routes/paths'
import type { MediaSourceType, StoredMedia } from '../types/media'

const CONNECT_DELAY_MS = 800

export function CommandStaffDronesMediaPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const {
    drones,
    liveDroneIds,
    connectDrone,
    startLiveFeed,
    captureMedia,
    addDemoDrone,
    mediaAssets,
    detections,
    incidents,
    missions,
  } = useCommandStaffData()

  const agencyId = session?.agencyId

  const [connectingDroneId, setConnectingDroneId] = useState<string | null>(null)
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null)
  const [feedSource, setFeedSource] = useState<MediaSourceType | null>(null)
  const [detectionCreated, setDetectionCreated] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [addVideoOpen, setAddVideoOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [filters, setFilters] = useState<MediaFilters>(EMPTY_MEDIA_FILTERS)

  const library = useMediaLibrary(agencyId)
  const upload = useUploadMedia()
  const captureFrame = useCaptureFrame()
  const deleteMedia = useDeleteMedia()
  const monitorMedia = useMonitorMedia()
  // Recorded clips play here, in their own section — Live Monitoring is live feeds only.
  const uploadedFeedsRef = useRef<HTMLDivElement>(null)
  const showUploadedFeeds = () => uploadedFeedsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const addFeed = useAddFeed()

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

  /**
   * Which mission each stored clip belongs to.
   *
   * Walks Mission -> Incident -> Detection -> MediaAsset and reads the
   * storedMediaId the upload recorded. That last hop is the only link between
   * the mock domain records and the API's media library, so a clip uploaded
   * outside an incident workflow — an ad-hoc Add Video, say — correctly has no
   * mission rather than being guessed at by filename or timestamp.
   */
  const missionByStoredMediaId = useMemo(() => {
    const map = new Map<string, string>()
    for (const mission of missions) {
      const incident = incidents.find((i) => i.id === mission.incidentId)
      if (!incident) continue
      const detection = detections.find((d) => d.id === incident.detectionId)
      if (!detection) continue
      const asset = mediaAssets.find((m) => m.id === detection.mediaAssetId)
      if (asset?.storedMediaId) map.set(asset.storedMediaId, mission.id)
    }
    return map
  }, [missions, incidents, detections, mediaAssets])

  const missionLabel = useCallback(
    (missionId: string) => {
      const mission = missions.find((m) => m.id === missionId)
      if (!mission) return missionId
      const incident = incidents.find((i) => i.id === mission.incidentId)
      const responder = mockUsers.find((u) => u.id === mission.responderUserId)
      const parts = [incident ? `${incident.priority} incident` : null, responder?.name].filter(Boolean)
      return parts.length ? parts.join(' — ') : mission.id
    },
    [missions, incidents],
  )

  const missionOptions = useMemo(
    // Only missions that actually have a clip: an option that can never match
    // anything is worse than no option at all.
    () =>
      [...new Set(missionByStoredMediaId.values())].map((missionId) => ({
        value: missionId,
        label: missionLabel(missionId),
      })),
    [missionByStoredMediaId, missionLabel],
  )

  const droneOptions = useMemo(
    () => drones.map((d) => ({ value: d.id, label: d.name })),
    [drones],
  )

  const filteredMedia = useMemo(() => {
    // Date bounds are inclusive whole days in the viewer's local time, which is
    // how someone reading "From 6 Sep To 6 Sep" expects a single day to behave.
    const fromMs = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : null
    const toMs = filters.to ? new Date(`${filters.to}T23:59:59.999`).getTime() : null

    return storedMedia.filter((item) => {
      if (filters.droneId && item.drone_id !== filters.droneId) return false
      if (filters.missionId && missionByStoredMediaId.get(item.id) !== filters.missionId) return false
      if (fromMs !== null || toMs !== null) {
        const at = new Date(item.uploaded_at).getTime()
        if (Number.isNaN(at)) return false
        if (fromMs !== null && at < fromMs) return false
        if (toMs !== null && at > toMs) return false
      }
      return true
    })
  }, [storedMedia, filters, missionByStoredMediaId])

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

  function handleAddDemoDrone() {
    const drone = addDemoDrone()
    // Connect it immediately: an operator who asked for a demo drone wants to
    // reach the feed step, not watch a second spinner first.
    handleConnect(drone.id)
  }

  /**
   * Page-level upload. Unlike handleUploadVideo this does not require a drone,
   * and it does not navigate away — the clip lands in the library below, where
   * Monitor sends it to Live Monitoring when the operator is ready.
   *
   * Deliberately does NOT call captureMedia: that fabricates a PENDING
   * detection per upload, and adding files in bulk here would bury the real
   * AI output under invented rows. Storing footage is not evidence of
   * anything — the detection is produced when someone actually monitors it.
   */
  function handleAddVideo(file: File, droneId: string | undefined) {
    upload.mutate(
      {
        file,
        agencyId,
        droneId,
        uploadedBy: session?.id,
        uploadedByName: session?.name,
      },
      {
        onSuccess: (stored) => {
          setUploadedName(stored.original_name)
          setAddVideoOpen(false)
        },
      },
    )
  }

  /**
   * Opens a real live source as a feed and hands off to Live Monitoring.
   *
   * A wildcard source means the API listens and the aircraft publishes to it,
   * so the feed is registered *before* the pilot starts streaming — the panel
   * simply stays dark until frames arrive.
   */
  function handleConnectFeed(source: string, label: string) {
    addFeed.mutate(
      { source, label },
      {
        onSuccess: () => {
          setConnectOpen(false)
          navigate(ROUTES.commandStaffLiveMonitoring)
        },
      },
    )
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
          captureMedia('UPLOADED_VIDEO', selectedDrone.id, stored.original_name, stored.id)
          setUploadedName(stored.original_name)
          setDetectionCreated(true)
          handleCloseFeedModal()
          // Open it as a feed straight away — an uploaded clip is only useful
          // once the AI is running on it — and play it in Uploaded Feeds below.
          monitorMedia.mutate(stored.id, { onSuccess: showUploadedFeeds })
        },
      },
    )
  }

  function handleMonitor(media: StoredMedia) {
    monitorMedia.mutate(media.id, { onSuccess: showUploadedFeeds })
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
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                addFeed.reset()
                setConnectOpen(true)
              }}
            >
              <Wifi className="size-3.5" />
              Connect Drone
            </Button>
          </div>
        </Reveal>

        <Reveal>
          <DroneList
            drones={drones}
            connectingDroneId={connectingDroneId}
            liveDroneIds={liveDroneIds}
            onConnect={handleConnect}
            onSelectFeedSource={handleSelectFeedSource}
            onViewLive={() => navigate(ROUTES.commandStaffLiveMonitoring)}
            onRegisterClick={() => navigate(ROUTES.commandStaffDroneRegistration)}
            onAddDemoDrone={handleAddDemoDrone}
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
          <UploadedFeedsSection ref={uploadedFeedsRef} />
        </Reveal>

        <Reveal delayMs={100}>
          <StoredMediaTable
            items={filteredMedia}
            loading={library.isLoading}
            error={libraryError}
            droneNameById={droneNameById}
            onReview={(media: StoredMedia) => setReviewingId(media.id)}
            onMonitor={handleMonitor}
            monitoringId={monitorMedia.isPending ? (monitorMedia.variables ?? null) : null}
            onRetry={() => void library.refetch()}
            missionLabelFor={(media) => {
              const missionId = missionByStoredMediaId.get(media.id)
              return missionId ? missionLabel(missionId) : undefined
            }}
            filteredToNothing={storedMedia.length > 0 && filteredMedia.length === 0 && hasActiveFilters(filters)}
            onClearFilters={() => setFilters(EMPTY_MEDIA_FILTERS)}
            filterBar={
              <MediaFilterBar
                filters={filters}
                onChange={setFilters}
                droneOptions={droneOptions}
                missionOptions={missionOptions}
                shown={filteredMedia.length}
                total={storedMedia.length}
              />
            }
            actions={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  upload.reset()
                  setAddVideoOpen(true)
                }}
              >
                <Plus className="size-3.5" />
                Add Video
              </Button>
            }
          />
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
          uploading={upload.isPending}
          uploadProgress={upload.progress}
          uploadError={uploadError}
          onCancelUpload={upload.abort ?? undefined}
        />
      ) : null}

      <ConnectDroneModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnect={handleConnectFeed}
        connecting={addFeed.isPending}
        error={addFeed.error instanceof Error ? addFeed.error.message : null}
      />

      <AddVideoModal
        open={addVideoOpen}
        onClose={() => setAddVideoOpen(false)}
        drones={drones}
        onUpload={handleAddVideo}
        uploading={upload.isPending}
        progress={upload.progress}
        error={uploadError}
        onCancelUpload={upload.abort ?? undefined}
      />

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
