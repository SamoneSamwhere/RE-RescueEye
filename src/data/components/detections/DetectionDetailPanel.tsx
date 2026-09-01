import { useState } from 'react'
import { Sparkles, ShieldCheck, MapPin, Clock, Gauge, Tag, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { Panel, Button, DetectionStatusBadge, PriorityBadge, EmptyState, DetailField } from '../ui'
import { formatDateTime } from '../../../lib/formatDateTime'
import { DETECTION_CATEGORY_LABEL, DAMAGE_CLASSIFICATION_LABEL } from '../../../lib/labels'
import { DetectionMediaPreview } from './DetectionMediaPreview'
import type { IncidentPriority } from '../../types/incident'
import type { EnrichedDetection } from './types'

interface LinkedIncident {
  id: string
  priority: IncidentPriority
}

interface DetectionDetailPanelProps {
  detection: EnrichedDetection | null
  reviewerName?: string
  linkedIncident?: LinkedIncident | null
  onVerify: (detectionId: string, priority: IncidentPriority, notes: string) => void
  onReject: (detectionId: string, notes: string) => void
}

const PRIORITY_OPTIONS: IncidentPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export function DetectionDetailPanel({ detection, reviewerName, linkedIncident, onVerify, onReject }: DetectionDetailPanelProps) {
  const [priority, setPriority] = useState<IncidentPriority>('MEDIUM')
  const [notes, setNotes] = useState('')

  if (!detection) {
    return (
      <Panel title="Detection Detail">
        <EmptyState icon={Sparkles} title="Select a detection" description="Choose a detection from the queue to review it." />
      </Panel>
    )
  }

  const isPending = detection.validationStatus === 'PENDING'

  return (
    <Panel title="Detection Detail">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            {DETECTION_CATEGORY_LABEL[detection.category]}
            {detection.damageClassification
              ? ` — ${DAMAGE_CLASSIFICATION_LABEL[detection.damageClassification]} Damage`
              : ''}
          </span>
          <DetectionStatusBadge status={detection.validationStatus} />
        </div>

        <DetectionMediaPreview
          category={detection.category}
          confidence={detection.confidence}
          boundingBox={detection.boundingBox}
          isLiveFeed={detection.sourceLabel.startsWith('Live Feed')}
        />

        {/* AI output — visually distinct from the human review section below */}
        <div className="rounded-md border border-accent-border bg-accent-subtle px-4 py-3">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <Sparkles className="size-3.5" />
            AI-Generated Output
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailField icon={Tag} label="Detection Type" value={DETECTION_CATEGORY_LABEL[detection.category]} />
            <DetailField icon={Gauge} label="Confidence Score" value={`${Math.round(detection.confidence * 100)}%`} />
            <DetailField icon={Clock} label="Timestamp" value={formatDateTime(detection.detectedAt)} />
            <DetailField
              icon={MapPin}
              label="Location"
              value={`${detection.location.lat.toFixed(4)}, ${detection.location.lng.toFixed(4)}`}
            />
          </div>
        </div>

        {/* Human review — visually distinct from AI output above */}
        <div className="rounded-md border border-border bg-surface px-4 py-3">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
            <ShieldCheck className="size-3.5" />
            Human Review
          </div>

          {isPending ? (
            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="reviewer-notes" className="mb-1 block text-xs font-medium uppercase tracking-wide text-foreground-secondary">
                  Reviewer Notes
                </label>
                <textarea
                  id="reviewer-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Optional for verification, recommended when rejecting"
                  className="w-full rounded-md border border-border-strong bg-surface px-2 py-2 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                />
              </div>

              <div>
                <label htmlFor="incident-priority" className="mb-1 block text-xs font-medium uppercase tracking-wide text-foreground-secondary">
                  Incident Priority (if verified)
                </label>
                <select
                  id="incident-priority"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as IncidentPriority)}
                  className="h-9 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={() => onVerify(detection.id, priority, notes)}>
                  <CheckCircle2 className="size-4" />
                  Verify
                </Button>
                <Button variant="danger" onClick={() => onReject(detection.id, notes)}>
                  <XCircle className="size-4" />
                  Reject
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-foreground-secondary">
                Reviewed by {reviewerName ?? 'Unknown'} on {detection.reviewedAt ? formatDateTime(detection.reviewedAt) : '—'}
              </p>
              {detection.reviewerNotes ? (
                <p className="rounded-md bg-surface-secondary px-2 py-2 text-sm text-foreground">{detection.reviewerNotes}</p>
              ) : null}

              {detection.validationStatus === 'VERIFIED' && linkedIncident ? (
                <div className="mt-1 flex items-center gap-2 rounded-md border border-success-border bg-success-bg px-3 py-2 text-sm text-success-fg">
                  <ArrowRight className="size-4 shrink-0" />
                  Confirmed Incident {linkedIncident.id} created
                  <PriorityBadge priority={linkedIncident.priority} />
                </div>
              ) : null}

              {detection.validationStatus === 'REJECTED' ? (
                <div className="mt-1 flex items-center gap-2 rounded-md border border-neutral-border bg-neutral-bg px-3 py-2 text-sm text-neutral-fg">
                  <XCircle className="size-4 shrink-0" />
                  No operational incident created
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
