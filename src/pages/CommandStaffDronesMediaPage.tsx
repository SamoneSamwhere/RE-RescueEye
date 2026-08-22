import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'
import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { DroneList, RegisterDroneModal } from '../components/drones'
import { FeedSourceSelector, LiveFeedPlaceholder, UploadVideoPlaceholder, MediaHistoryTable } from '../components/media'
import type { MediaHistoryItem } from '../components/media'
import { useAuth } from '../features/auth'
import { useCommandStaffData } from '../features/command-staff'
import { mockDrones } from '../data/mockDrones'
import { mockUsers } from '../data/mockUsers'
import { now } from '../lib/now'
import { generateId } from '../lib/id'
import { ROUTES } from '../routes/paths'
import type { Drone } from '../types/drone'
import type { MediaSourceType } from '../types/media'

const CONNECT_DELAY_MS = 800

export function CommandStaffDronesMediaPage() {
  const { session } = useAuth()
  const { mediaAssets, captureMedia } = useCommandStaffData()
  const agencyId = session?.agencyId

  const [drones, setDrones] = useState<Drone[]>(() => mockDrones.filter((d) => d.agencyId === agencyId))
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [connectingDroneId, setConnectingDroneId] = useState<string | null>(null)
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null)
  const [feedSource, setFeedSource] = useState<MediaSourceType | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [detectionCreated, setDetectionCreated] = useState(false)

  const selectedDrone = drones.find((d) => d.id === selectedDroneId) ?? null

  function handleRegister(input: { name: string; serialNumber: string }) {
    if (!agencyId) return
    const newDrone: Drone = {
      id: generateId('drone'),
      agencyId,
      name: input.name,
      serialNumber: input.serialNumber,
      connectionStatus: 'DISCONNECTED',
      registeredAt: now().toISOString(),
    }
    setDrones((prev) => [...prev, newDrone])
  }

  function handleConnect(droneId: string) {
    setConnectingDroneId(droneId)
    window.setTimeout(() => {
      setDrones((prev) =>
        prev.map((drone) =>
          drone.id === droneId
            ? { ...drone, connectionStatus: 'CONNECTED', lastConnectedAt: now().toISOString() }
            : drone,
        ),
      )
      setConnectingDroneId(null)
    }, CONNECT_DELAY_MS)
  }

  function handleSelectFeedSource(droneId: string) {
    setSelectedDroneId(droneId)
    setFeedSource(null)
    setIsLive(false)
    setDetectionCreated(false)
  }

  /** Live Feed frame -> mock AI Detection, ready for Detection Review. */
  function handleSaveLiveToHistory() {
    if (!selectedDrone) return
    captureMedia('LIVE_FEED', selectedDrone.id)
    setDetectionCreated(true)
  }

  /** Uploaded video -> mock AI Detection, ready for Detection Review. */
  function handleUploadVideo(fileName: string) {
    if (!selectedDrone) return
    captureMedia('UPLOADED_VIDEO', selectedDrone.id, fileName)
    setDetectionCreated(true)
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
            selectedDroneId={selectedDroneId}
            onConnect={handleConnect}
            onSelectFeedSource={handleSelectFeedSource}
            onRegisterClick={() => setRegisterModalOpen(true)}
          />
        </Reveal>

        {selectedDrone ? (
          <FeedSourceSelector droneName={selectedDrone.name} selected={feedSource} onSelect={setFeedSource} />
        ) : null}

        {selectedDrone && feedSource === 'LIVE_FEED' ? (
          <LiveFeedPlaceholder
            droneName={selectedDrone.name}
            isLive={isLive}
            onToggleLive={() => setIsLive((v) => !v)}
            onSaveToHistory={handleSaveLiveToHistory}
          />
        ) : null}

        {selectedDrone && feedSource === 'UPLOADED_VIDEO' ? (
          <UploadVideoPlaceholder droneName={selectedDrone.name} onUpload={handleUploadVideo} />
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
          <MediaHistoryTable items={mediaHistoryItems} />
        </Reveal>
      </div>

      <RegisterDroneModal
        open={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onRegister={handleRegister}
        existingSerialNumbers={drones.map((d) => d.serialNumber)}
      />
    </>
  )
}
