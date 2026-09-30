import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Send } from 'lucide-react'
import { PageHeader } from '../data/components/layout'
import { Reveal } from '../data/components/landing/Reveal'
import { DetectionQueueList, DetectionDetailPanel } from '../data/components/detections'
import type { EnrichedDetection } from '../data/components/detections'
import { ResponderSelectionPanel } from '../data/components/responders'
import { Panel, Modal, Button, EmptyState } from '../data/components/ui'
import { useAuth } from '../features/auth'
import { useCommandStaffData } from '../features/command-staff'
import { useResponderCandidates } from '../hooks/useResponderCandidates'
import { mockDrones } from '../data/mockDrones'
import { mockUsers } from '../data/mockUsers'
import { sourceLabelFor } from '../lib/sourceLabel'
import { ACTIVE_MISSION_STATUSES } from '../lib/missionStatus'
import type { DetectionValidationStatus } from '../types/detection'
import type { IncidentPriority } from '../types/incident'

type StatusFilter = DetectionValidationStatus | 'ALL'

/**
 * Only detections the model is reasonably sure about reach the review queue.
 *
 * The casualty detector fires on small ground clutter at low confidence, so a
 * queue with no floor buries the real casualties among grass tufts and a
 * reviewer stops reading it. 0.60 is the floor; the upper bound is stated
 * explicitly because confidence is a probability and can never exceed it.
 */
const MIN_REVIEW_CONFIDENCE = 0.6
const MAX_REVIEW_CONFIDENCE = 1.0

function isReviewable(confidence: number): boolean {
  return confidence >= MIN_REVIEW_CONFIDENCE && confidence <= MAX_REVIEW_CONFIDENCE
}

export function CommandStaffDetectionReviewPage() {
  const { session } = useAuth()
  const { detections, incidents, missions, mediaAssets, verifyDetection, rejectDetection, dispatchIncident } =
    useCommandStaffData()

  // Arriving from Live Monitoring's "Verify casualty": open on that detection.
  // It is VERIFIED by then, so the PENDING default would hide it from the queue.
  const location = useLocation()
  const arrivedWith = (location.state as { selectDetectionId?: string } | null)?.selectDetectionId

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(arrivedWith ? 'ALL' : 'PENDING')
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (arrivedWith) return arrivedWith
    const pending = [...detections]
      .filter((d) => d.validationStatus === 'PENDING' && isReviewable(d.confidence))
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
    return pending[0]?.id ?? null
  })

  const enrichedDetections: EnrichedDetection[] = useMemo(
    () =>
      [...detections]
        .filter((detection) => isReviewable(detection.confidence))
        .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
        .map((detection) => ({
          ...detection,
          sourceLabel: sourceLabelFor(detection.mediaAssetId, mediaAssets, mockDrones),
        })),
    [detections, mediaAssets],
  )

  const filteredDetections = useMemo(
    () =>
      statusFilter === 'ALL' ? enrichedDetections : enrichedDetections.filter((d) => d.validationStatus === statusFilter),
    [enrichedDetections, statusFilter],
  )

  const selectedDetection = enrichedDetections.find((d) => d.id === selectedId) ?? null

  const reviewerName = selectedDetection?.reviewedByUserId
    ? mockUsers.find((u) => u.id === selectedDetection.reviewedByUserId)?.name
    : undefined

  const linkedIncident = selectedDetection
    ? (incidents.find((i) => i.detectionId === selectedDetection.id) ?? null)
    : null

  // Dispatch — this is the only place Command Staff assigns a responder to an
  // incident (see CommandStaffIncidentDetailPage, which links back here for
  // that reason instead of duplicating the picker).
  const responderCandidates = useResponderCandidates(selectedDetection, session?.agencyId, incidents, missions)
  const [selectedResponderId, setSelectedResponderId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [dispatchSuccess, setDispatchSuccess] = useState<{ responderName: string } | null>(null)

  useEffect(() => {
    setSelectedResponderId(null)
    setConfirmOpen(false)
    setDispatchSuccess(null)
  }, [selectedId])

  const selectedCandidate = responderCandidates.find((c) => c.id === selectedResponderId) ?? null
  const hasActiveMission = linkedIncident
    ? missions.some((m) => m.incidentId === linkedIncident.id && ACTIVE_MISSION_STATUSES.has(m.status))
    : false

  function handleVerify(detectionId: string, priority: IncidentPriority, notes: string) {
    verifyDetection(detectionId, priority, notes)
  }

  function handleReject(detectionId: string, notes: string) {
    rejectDetection(detectionId, notes)
  }

  function handleConfirmDispatch() {
    if (!linkedIncident || !selectedCandidate) return
    const mission = dispatchIncident(linkedIncident.id, selectedCandidate.id)
    if (!mission) return
    setDispatchSuccess({ responderName: selectedCandidate.name })
    setConfirmOpen(false)
    setSelectedResponderId(null)
  }

  return (
    <>
      <PageHeader
        title="Detection Review"
        description={`Review AI-generated detections at ${Math.round(MIN_REVIEW_CONFIDENCE * 100)}-${Math.round(
          MAX_REVIEW_CONFIDENCE * 100,
        )}% confidence, then assign a responder once verified. Verifying confirms an incident; rejecting discards it —
        neither happens automatically.`}
      />

      <div className="flex flex-col gap-6 px-4 py-4">
        <Reveal className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <DetectionQueueList
            detections={filteredDetections}
            selectedId={selectedId}
            statusFilter={statusFilter}
            onSelect={setSelectedId}
            onStatusFilterChange={setStatusFilter}
          />
          <DetectionDetailPanel
            key={selectedDetection?.id ?? 'none'}
            detection={selectedDetection}
            reviewerName={reviewerName}
            linkedIncident={linkedIncident}
            onVerify={handleVerify}
            onReject={handleReject}
          />
        </Reveal>

        {/* Only once a detection is verified is there an Incident to assign a responder to. */}
        {selectedDetection?.validationStatus === 'VERIFIED' && linkedIncident ? (
          <Reveal delayMs={100}>
            {dispatchSuccess ? (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-success-border bg-success-bg px-3 py-2 text-sm text-success-fg">
                <Send className="size-4 shrink-0" />
                Mission dispatched to {dispatchSuccess.responderName}. SMS notification sent — mission status: PENDING.
              </div>
            ) : null}

            {hasActiveMission ? (
              <Panel title="Select Field Responder to Notify">
                <EmptyState
                  icon={Send}
                  title="A mission is already in progress"
                  description="This incident already has an active mission. It will be dispatchable to a new responder again if that mission is declined."
                />
              </Panel>
            ) : (
              <ResponderSelectionPanel
                candidates={responderCandidates}
                selectedId={selectedResponderId}
                onSelect={setSelectedResponderId}
                onNotify={() => setConfirmOpen(true)}
              />
            )}
          </Reveal>
        ) : null}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Dispatch"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmDispatch}>Confirm Dispatch</Button>
          </>
        }
      >
        {selectedCandidate ? (
          <div className="flex flex-col gap-2">
            <p>
              Dispatch this incident to <strong>{selectedCandidate.name}</strong>?
            </p>
            <p className="text-foreground-secondary">
              {selectedCandidate.distanceKm !== null
                ? `They are ${selectedCandidate.distanceKm.toFixed(1)} km from the incident location.`
                : 'Their distance from the incident is unknown.'}{' '}
              They will receive a mock SMS mission notification, and the mission will begin in <strong>PENDING</strong> status.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
