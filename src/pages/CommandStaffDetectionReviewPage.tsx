import { useMemo, useState } from 'react'
import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { DetectionQueueList, DetectionDetailPanel, PossibleCasualtyCard } from '../components/detections'
import type { EnrichedDetection } from '../components/detections'
import { useCommandStaffData } from '../features/command-staff'
import { mockDrones } from '../data/mockDrones'
import { mockUsers } from '../data/mockUsers'
import { sourceLabelFor } from '../lib/sourceLabel'
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
  const { detections, incidents, mediaAssets, verifyDetection, rejectDetection } = useCommandStaffData()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING')
  const [selectedId, setSelectedId] = useState<string | null>(() => {
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

  // Surfaced above the queue so a fresh casualty is decided on immediately
  // rather than waiting for someone to notice a new row.
  const latestPendingCasualty = useMemo(
    () =>
      enrichedDetections.find(
        (d) => d.category === 'CASUALTY' && d.validationStatus === 'PENDING',
      ) ?? null,
    [enrichedDetections],
  )

  const reviewerName = selectedDetection?.reviewedByUserId
    ? mockUsers.find((u) => u.id === selectedDetection.reviewedByUserId)?.name
    : undefined

  const linkedIncident = selectedDetection
    ? (() => {
        const incident = incidents.find((i) => i.detectionId === selectedDetection.id)
        return incident ? { id: incident.id, priority: incident.priority } : null
      })()
    : null

  function handleVerify(detectionId: string, priority: IncidentPriority, notes: string) {
    verifyDetection(detectionId, priority, notes)
  }

  function handleReject(detectionId: string, notes: string) {
    rejectDetection(detectionId, notes)
  }

  return (
    <>
      <PageHeader
        title="Detection Review"
        description={`Review AI-generated detections at ${Math.round(MIN_REVIEW_CONFIDENCE * 100)}-${Math.round(
          MAX_REVIEW_CONFIDENCE * 100,
        )}% confidence. Verifying confirms an incident; rejecting discards it — neither happens automatically.`}
      />

      {latestPendingCasualty ? (
        <div className="px-4 pt-4">
          <PossibleCasualtyCard
            detection={latestPendingCasualty}
            onVerify={(id) => handleVerify(id, 'MEDIUM', '')}
          />
        </div>
      ) : null}

      <Reveal className="grid grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
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
    </>
  )
}
