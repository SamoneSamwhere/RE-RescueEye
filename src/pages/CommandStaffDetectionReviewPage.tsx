import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Send } from 'lucide-react'
import { PageHeader } from '../data/components/layout'
import { Reveal } from '../data/components/landing/Reveal'
import {
  DetectionQueueList,
  DetectionDetailPanel,
  VerifyDispatchModal,
  RejectDetectionModal,
} from '../data/components/detections'
import type { EnrichedDetection, VerifyDispatchSubmit } from '../data/components/detections'
import { useAuth } from '../features/auth'
import { useCommandStaffData } from '../features/command-staff'
import { useResponderCandidates } from '../hooks/useResponderCandidates'
import { mockDrones } from '../data/mockDrones'
import { mockUsers } from '../data/mockUsers'
import { sourceLabelFor } from '../lib/sourceLabel'
import { responseTeamFor } from '../lib/responseTeams'
import { suggestPriority } from '../lib/priority'
import type { DetectionValidationStatus } from '../types/detection'

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
  // Both decisions happen in a window over the page, so the evidence stays put.
  const responderCandidates = useResponderCandidates(selectedDetection, session?.agencyId, incidents, missions)
  const [dialog, setDialog] = useState<'verify' | 'dispatch' | 'reject' | null>(null)
  const [outcome, setOutcome] = useState<string | null>(null)

  useEffect(() => {
    setDialog(null)
    setOutcome(null)
  }, [selectedId])

  const team = linkedIncident ? responseTeamFor(missions, linkedIncident.id) : null
  const nameOf = (userId: string) => mockUsers.find((u) => u.id === userId)?.name ?? 'Unknown'
  const teamMemberNames = team ? team.members.map((m) => nameOf(m.responderUserId)) : []

  /** Alerts responders for an incident and describes what happened, for the banner. */
  function alert(incidentId: string, responderIds: string[]): string | null {
    if (responderIds.length === 0) return null
    const dispatched = dispatchResponders(incidentId, responderIds)
    if (dispatched.length === 0) return null
    const teamSize = (team?.members.length ?? 0) + dispatched.length
    return `Alerted ${dispatched.map((m) => nameOf(m.responderUserId)).join(', ')}. The response team now has ${teamSize} ${
      teamSize === 1 ? 'member' : 'members'
    } — each mission starts as PENDING.`
  }

  function handleVerifySubmit({ priority, notes, responderIds }: VerifyDispatchSubmit) {
    if (!selectedDetection) return
    const incidentId = verifyDetection(selectedDetection.id, priority, notes)
    if (!incidentId) return
    setOutcome(alert(incidentId, responderIds) ?? `Verified — incident ${incidentId} created. No responders alerted yet.`)
    setDialog(null)
  }

  function handleDispatchSubmit({ responderIds }: VerifyDispatchSubmit) {
    if (!linkedIncident) return
    setOutcome(alert(linkedIncident.id, responderIds))
    setDialog(null)
  }

  function handleReject(notes: string) {
    if (!selectedDetection) return
    rejectDetection(selectedDetection.id, notes)
    setDialog(null)
  }

  return (
    <>
      <PageHeader
        title="Detection Review"
        description={`Review AI-generated detections at ${Math.round(MIN_REVIEW_CONFIDENCE * 100)}-${Math.round(
          MAX_REVIEW_CONFIDENCE * 100,
        )}% confidence. Verify to confirm an incident and alert the nearest available responders; reject to discard it —
        neither happens automatically.`}
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        {outcome ? (
          <div className="flex items-center gap-2 rounded-md border border-success-border bg-success-bg px-3 py-2 text-sm text-success-fg">
            <Send className="size-4 shrink-0" />
            {outcome}
          </div>
        ) : null}

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
            teamMemberNames={teamMemberNames}
            onOpenVerify={() => setDialog('verify')}
            onOpenReject={() => setDialog('reject')}
            onOpenDispatch={linkedIncident && linkedIncident.status !== 'CLOSED' ? () => setDialog('dispatch') : undefined}
          />
        </Reveal>
      </div>

      {/* Mounted only while open, so each opening starts with a clean form. */}
      {selectedDetection && (dialog === 'verify' || dialog === 'dispatch') ? (
        <VerifyDispatchModal
          open
          onClose={() => setDialog(null)}
          mode={dialog}
          suggestedPriority={suggestPriority(selectedDetection)}
          candidates={responderCandidates}
          hasTeam={teamMemberNames.length > 0}
          onSubmit={dialog === 'verify' ? handleVerifySubmit : handleDispatchSubmit}
        />
      ) : null}

      {selectedDetection && dialog === 'reject' ? (
        <RejectDetectionModal open onClose={() => setDialog(null)} onReject={handleReject} />
      ) : null}
    </>
  )
}
