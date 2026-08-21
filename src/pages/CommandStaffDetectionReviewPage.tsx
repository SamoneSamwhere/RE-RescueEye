import { useMemo, useState } from 'react'
import { AppShell, PageHeader } from '../components/layout'
import { DetectionQueueList, DetectionDetailPanel } from '../components/detections'
import type { EnrichedDetection } from '../components/detections'
import { useAuth } from '../features/auth'
import { COMMAND_STAFF_NAV_ITEMS, useCommandStaffData } from '../features/command-staff'
import { mockDrones } from '../data/mockDrones'
import { mockUsers } from '../data/mockUsers'
import { sourceLabelFor } from '../lib/sourceLabel'
import type { DetectionValidationStatus } from '../types/detection'
import type { IncidentPriority } from '../types/incident'

type StatusFilter = DetectionValidationStatus | 'ALL'

export function CommandStaffDetectionReviewPage() {
  const { session, logout } = useAuth()
  const { detections, incidents, mediaAssets, verifyDetection, rejectDetection } = useCommandStaffData()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING')
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const pending = [...detections]
      .filter((d) => d.validationStatus === 'PENDING')
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
    return pending[0]?.id ?? null
  })

  const enrichedDetections: EnrichedDetection[] = useMemo(
    () =>
      [...detections]
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

  if (!session) return null

  return (
    <AppShell
      user={{ name: session.name, role: session.role, agencyName: session.agencyName }}
      navItems={COMMAND_STAFF_NAV_ITEMS}
      onLogout={logout}
    >
      <PageHeader
        title="Detection Review"
        description="Review AI-generated detections. Verifying confirms an incident; rejecting discards it — neither happens automatically."
      />

      <div className="grid grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
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
      </div>
    </AppShell>
  )
}
