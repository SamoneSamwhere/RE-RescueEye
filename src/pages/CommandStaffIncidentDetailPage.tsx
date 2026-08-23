import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Archive, Send, Tag, Gauge, Clock } from 'lucide-react'
import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { Panel, Button, Modal, PriorityBadge, Badge, DetectionStatusBadge, EmptyState, DetailField } from '../components/ui'
import { DetectionMediaPreview } from '../components/detections'
import { IncidentTimeline } from '../components/incidents'
import { DamageMapPreview } from '../components/map'
import { ResponderSelectionPanel } from '../components/responders'
import { useAuth } from '../features/auth'
import { useCommandStaffData } from '../features/command-staff'
import { useResponderCandidates } from '../hooks/useResponderCandidates'
import { useIncidentTimeline } from '../hooks/useIncidentTimeline'
import { mockDrones } from '../data/mockDrones'
import { sourceLabelFor } from '../lib/sourceLabel'
import { formatDateTime } from '../lib/formatDateTime'
import { DETECTION_CATEGORY_LABEL, INCIDENT_STATUS_LABEL } from '../lib/labels'
import { ACTIVE_MISSION_STATUSES } from '../lib/missionStatus'
import { ROUTES } from '../routes/paths'
import type { IncidentPriority } from '../types/incident'

const PRIORITY_OPTIONS: IncidentPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export function CommandStaffIncidentDetailPage() {
  const { session } = useAuth()
  const { incidentId } = useParams<{ incidentId: string }>()
  const { incidents, detections, missions, mediaAssets, updateIncidentPriority, dispatchIncident, closeIncident } =
    useCommandStaffData()

  const incident = incidents.find((i) => i.id === incidentId) ?? null
  const detection = incident ? (detections.find((d) => d.id === incident.detectionId) ?? null) : null

  const [pendingPriority, setPendingPriority] = useState<IncidentPriority | null>(incident?.priority ?? null)
  const [selectedResponderId, setSelectedResponderId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [dispatchSuccess, setDispatchSuccess] = useState<{ responderName: string } | null>(null)

  useEffect(() => {
    setSelectedResponderId(null)
    setConfirmOpen(false)
    setDispatchSuccess(null)
  }, [incidentId])

  const sourceLabel = detection ? sourceLabelFor(detection.mediaAssetId, mediaAssets, mockDrones) : ''
  const timelineEvents = useIncidentTimeline(incident, detection, missions, sourceLabel)
  const responderCandidates = useResponderCandidates(detection, session?.agencyId, incidents, missions)

  if (!incident || !detection) {
    return (
      <>
        <PageHeader title="Incident Not Found" />
        <div className="px-4 py-4">
          <EmptyState title="This incident could not be found" description="It may not exist in your agency." />
        </div>
      </>
    )
  }

  const selectedCandidate = responderCandidates.find((candidate) => candidate.id === selectedResponderId) ?? null
  const hasCompletedMission = missions.some((m) => m.incidentId === incident.id && m.status === 'COMPLETED')
  const hasActiveMission = missions.some(
    (m) => m.incidentId === incident.id && ACTIVE_MISSION_STATUSES.has(m.status),
  )

  function handleUpdatePriority() {
    if (!incident || !pendingPriority || pendingPriority === incident.priority) return
    updateIncidentPriority(incident.id, pendingPriority)
  }

  function handleConfirmDispatch() {
    if (!incident || !selectedCandidate) return
    const mission = dispatchIncident(incident.id, selectedCandidate.id)
    if (!mission) return
    setDispatchSuccess({ responderName: selectedCandidate.name })
    setConfirmOpen(false)
    setSelectedResponderId(null)
  }

  function handleCloseIncident() {
    if (!incident) return
    closeIncident(incident.id)
  }

  return (
    <>
      <PageHeader
        title={incident.id}
        description={`${DETECTION_CATEGORY_LABEL[detection.category]} incident — verified ${formatDateTime(incident.verifiedAt)}`}
        actions={
          <Link
            to={ROUTES.commandStaffIncidents}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-secondary hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Incidents
          </Link>
        }
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={incident.priority} />
            <Badge tone="neutral">{INCIDENT_STATUS_LABEL[incident.status] ?? incident.status}</Badge>
            <DetectionStatusBadge status={detection.validationStatus} />
          </div>
          {incident.status !== 'CLOSED' ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={!hasCompletedMission}
              title={hasCompletedMission ? undefined : 'Available once a dispatched mission is completed'}
              onClick={handleCloseIncident}
            >
              <Archive className="size-3.5" />
              Close Incident
            </Button>
          ) : null}
        </Reveal>

        <Reveal delayMs={100} className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="Detection Evidence">
            <div className="flex flex-col gap-4">
              <DetectionMediaPreview
                category={detection.category}
                confidence={detection.confidence}
                boundingBox={detection.boundingBox}
                isLiveFeed={sourceLabel.startsWith('Live Feed')}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailField icon={Tag} label="Detection Type" value={DETECTION_CATEGORY_LABEL[detection.category]} />
                <DetailField icon={Gauge} label="Confidence Score" value={`${Math.round(detection.confidence * 100)}%`} />
                <DetailField icon={Clock} label="Detected" value={formatDateTime(detection.detectedAt)} />
                <DetailField icon={CheckCircle2} label="Verification Status" value={detection.validationStatus} />
              </div>
              {detection.reviewerNotes ? (
                <p className="rounded-md bg-surface-secondary px-3 py-2 text-sm text-foreground">{detection.reviewerNotes}</p>
              ) : null}
            </div>
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel title="Incident Priority">
              <div className="flex flex-col gap-3">
                <p className="text-sm text-foreground-secondary">
                  Set or update this incident's priority. Dispatch is handled separately.
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={pendingPriority ?? incident.priority}
                    onChange={(event) => setPendingPriority(event.target.value as IncidentPriority)}
                    className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!pendingPriority || pendingPriority === incident.priority}
                    onClick={handleUpdatePriority}
                  >
                    Update Priority
                  </Button>
                </div>
              </div>
            </Panel>

            <DamageMapPreview
              title="Incident Location"
              emptyLabel="No location on record"
              pins={[{ id: incident.id, priority: incident.priority }]}
            />
            <p className="-mt-2 px-1 text-xs text-foreground-muted">
              Coordinates: {detection.location.lat.toFixed(4)}, {detection.location.lng.toFixed(4)}
            </p>
          </div>
        </Reveal>

        <Reveal delayMs={200} className="flex flex-col gap-4">
          {dispatchSuccess ? (
            <div className="flex items-center gap-2 rounded-md border border-success-border bg-success-bg px-3 py-2 text-sm text-success-fg">
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

        <Reveal delayMs={300}>
          <Panel title="Incident Timeline">
            <IncidentTimeline events={timelineEvents} />
          </Panel>
        </Reveal>
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
