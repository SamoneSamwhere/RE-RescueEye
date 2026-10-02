import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Send } from 'lucide-react'
import { PageHeader } from '../data/components/layout'
import { Reveal } from '../data/components/landing/Reveal'
import { DetectionQueueList, DetectionDetailPanel } from '../data/components/detections'
import type { EnrichedDetection } from '../data/components/detections'
import { ResponderSelectionPanel } from '../data/components/responders'
import { Modal, Button } from '../data/components/ui'
import { useAuth } from '../features/auth'
import { useCommandStaffData } from '../features/command-staff'
import { useResponderCandidates } from '../hooks/useResponderCandidates'
import { mockDrones } from '../data/mockDrones'
import { mockUsers } from '../data/mockUsers'
import { sourceLabelFor } from '../lib/sourceLabel'
import { responseTeamFor } from '../lib/responseTeams'
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
  const { detections, incidents, missions, mediaAssets, verifyDetection, rejectDetection, dispatchResponders } =
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

  // Dispatch — this is the only place Command Staff alerts responders for an
  // incident (see CommandStaffIncidentDetailPage, which links back here for
  // that reason instead of duplicating the picker). The responders alerted
  // form the incident's response team; alerting more later adds to it.
  const responderCandidates = useResponderCandidates(selectedDetection, session?.agencyId, incidents, missions)
  const [selectedResponderIds, setSelectedResponderIds] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [dispatchSuccess, setDispatchSuccess] = useState<{ names: string[]; teamSize: number } | null>(null)

  useEffect(() => {
    setSelectedResponderIds([])
    setConfirmOpen(false)
    setDispatchSuccess(null)
  }, [selectedId])

  const selectedCandidates = responderCandidates.filter((c) => c.isAvailable && selectedResponderIds.includes(c.id))
  const team = linkedIncident ? responseTeamFor(missions, linkedIncident.id) : null

  function toggleResponder(id: string) {
    setSelectedResponderIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleVerify(detectionId: string, priority: IncidentPriority, notes: string) {
    verifyDetection(detectionId, priority, notes)
  }

  function handleReject(detectionId: string, notes: string) {
    rejectDetection(detectionId, notes)
  }

  function handleConfirmDispatch() {
    if (!linkedIncident || selectedCandidates.length === 0) return
    const dispatched = dispatchResponders(
      linkedIncident.id,
      selectedCandidates.map((c) => c.id),
    )
    if (dispatched.length === 0) return
    const dispatchedIds = new Set(dispatched.map((m) => m.responderUserId))
    setDispatchSuccess({
      names: selectedCandidates.filter((c) => dispatchedIds.has(c.id)).map((c) => c.name),
      teamSize: (team?.members.length ?? 0) + dispatched.length,
    })
    setConfirmOpen(false)
    setSelectedResponderIds([])
  }

  return (
    <>
      <PageHeader
        title="Detection Review"
        description={`Review AI-generated detections at ${Math.round(MIN_REVIEW_CONFIDENCE * 100)}-${Math.round(
          MAX_REVIEW_CONFIDENCE * 100,
        )}% confidence, then alert the nearest available responders once verified. Verifying confirms an incident; rejecting discards it —
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
                Alerted {dispatchSuccess.names.join(', ')}. The response team now has {dispatchSuccess.teamSize}{' '}
                {dispatchSuccess.teamSize === 1 ? 'member' : 'members'} — each mission starts as PENDING.
              </div>
            ) : null}

            {team && team.members.length > 0 ? (
              <p className="mb-2 text-xs text-foreground-muted">
                Response team: {team.members.map((m) => mockUsers.find((u) => u.id === m.responderUserId)?.name ?? 'Unknown').join(', ')}
              </p>
            ) : null}

            <ResponderSelectionPanel
              candidates={responderCandidates}
              selectedIds={selectedResponderIds}
              onToggle={toggleResponder}
              onNotify={() => setConfirmOpen(true)}
              hasTeam={Boolean(team && team.members.length > 0)}
            />

          </Reveal>
        ) : null}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Alert"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmDispatch}>Alert Responders</Button>
          </>
        }
      >
        {selectedCandidates.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p>
              Alert {selectedCandidates.length === 1 ? 'this responder' : `these ${selectedCandidates.length} responders`}{' '}
              and {team && team.members.length > 0 ? 'add them to' : 'form'} this incident&apos;s response team?
            </p>
            <ul className="flex flex-col gap-1 text-foreground-secondary">
              {selectedCandidates.map((candidate) => (
                <li key={candidate.id}>
                  <strong className="text-foreground">{candidate.name}</strong>
                  {candidate.distanceKm !== null ? ` — ${candidate.distanceKm.toFixed(1)} km away` : ' — distance unknown'}
                </li>
              ))}
            </ul>
            <p className="text-foreground-secondary">
              Each receives a mock SMS mission notification, and each mission begins in <strong>PENDING</strong> status.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
