import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageSquareWarning,
  Phone,
  RotateCcw,
  Tag,
  User,
  X,
} from 'lucide-react'
import { PageHeader } from '../data/components/layout'
import { Reveal } from '../data/components/landing/Reveal'
import { Badge, Button, DetailField, EmptyState, Modal, Panel } from '../data/components/ui'
import { AgencyDocumentCard, AgencyDocumentViewer } from '../data/components/system-admin'
import { useSystemAdminData } from '../features/system-admin'
import { REQUIRED_DOCUMENTS } from '../data/components/landing/registration/types'
import { formatDateTime } from '../lib/formatDateTime'
import { AGENCY_REGISTRATION_STATUS_LABEL, AGENCY_REGISTRATION_STATUS_TONE } from '../lib/labels'
import { ROUTES } from '../routes/paths'

type ConfirmAction = 'approve' | 'reject' | 'resubmission' | 'reopen' | null

export function SystemAdminAgencyValidationDetailPage() {
  const { agencyId } = useParams<{ agencyId: string }>()
  const { agencies, approveAgency, rejectAgency, requestResubmission, resubmitAgency } = useSystemAdminData()

  const agency = agencies.find((a) => a.id === agencyId) ?? null

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [reasonText, setReasonText] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [viewerStartIndex, setViewerStartIndex] = useState<number | null>(null)

  if (!agency) {
    return (
      <>
        <PageHeader title="Registration Not Found" />
        <div className="px-4 py-4">
          <EmptyState title="This agency registration could not be found" description="It may have been removed." />
        </div>
      </>
    )
  }

  const isReviewable = agency.registrationStatus === 'PENDING' || agency.registrationStatus === 'RESUBMISSION_REQUIRED'

  function closeConfirm() {
    setConfirmAction(null)
    setReasonText('')
  }

  function handleConfirm() {
    if (!agency) return
    if (confirmAction === 'approve') {
      approveAgency(agency.id)
      setSuccessMessage(`${agency.name} has been approved.`)
    } else if (confirmAction === 'reject') {
      if (!reasonText.trim()) return
      rejectAgency(agency.id, reasonText.trim())
      setSuccessMessage(`${agency.name}'s registration has been rejected.`)
    } else if (confirmAction === 'resubmission') {
      if (!reasonText.trim()) return
      requestResubmission(agency.id, reasonText.trim())
      setSuccessMessage(`${agency.name} has been asked to resubmit corrected information.`)
    } else if (confirmAction === 'reopen') {
      resubmitAgency(agency.id)
      setSuccessMessage(`${agency.name}'s registration has been reopened for review.`)
    }
    closeConfirm()
  }

  const documentsById = new Map(agency.documents.map((doc) => [doc.id, doc] as const))

  return (
    <>
      <PageHeader
        title={agency.name}
        description={`Registration ID: ${agency.id}`}
        actions={
          <Link
            to={ROUTES.systemAdminAgencyValidation}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-secondary hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Agency Validation
          </Link>
        }
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        {successMessage ? (
          <Reveal className="flex items-center gap-2 rounded-md border border-success-border bg-success-bg px-3 py-2 text-sm text-success-fg motion-safe:animate-fade-in">
            <CheckCircle2 className="size-4 shrink-0" />
            {successMessage}
          </Reveal>
        ) : null}

        <Reveal className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 shadow-panel">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={AGENCY_REGISTRATION_STATUS_TONE[agency.registrationStatus]}>
              {AGENCY_REGISTRATION_STATUS_LABEL[agency.registrationStatus]}
            </Badge>
            <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
              <Clock className="size-3.5" />
              Submitted {formatDateTime(agency.registeredAt)}
            </span>
            {agency.reviewedAt ? (
              <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <Clock className="size-3.5" />
                Last reviewed {formatDateTime(agency.reviewedAt)}
              </span>
            ) : null}
          </div>
        </Reveal>

        <Reveal delayMs={100} className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="Agency Information">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField icon={Building2} label="Agency Name" value={agency.name} />
              <DetailField icon={Tag} label="Agency Type" value={agency.agencyType} />
              <DetailField icon={Mail} label="Official Email" value={agency.contactEmail} />
              <DetailField icon={Phone} label="Contact Number" value={agency.contactPhone ?? 'Not provided'} />
              <DetailField icon={MapPin} label="Address" value={agency.address} />
              <DetailField icon={Globe} label="Website" value={agency.website ?? 'Not provided'} />
            </div>
          </Panel>

          <Panel title="Agency Admin Information">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField icon={User} label="Full Name" value={agency.agencyAdmin.fullName} />
              <DetailField icon={Briefcase} label="Position / Designation" value={agency.agencyAdmin.position} />
              <DetailField icon={Mail} label="Email" value={agency.agencyAdmin.email} />
              <DetailField icon={Phone} label="Contact Number" value={agency.agencyAdmin.phone} />
            </div>
          </Panel>
        </Reveal>

        <Reveal delayMs={200}>
          <Panel title="Verification Documents">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {REQUIRED_DOCUMENTS.map((meta) => {
                const doc = documentsById.get(meta.id)
                return (
                  <AgencyDocumentCard
                    key={meta.id}
                    label={meta.label}
                    required={meta.required}
                    document={doc}
                    onView={
                      doc
                        ? () => setViewerStartIndex(agency.documents.findIndex((d) => d.id === meta.id))
                        : undefined
                    }
                  />
                )
              })}
            </div>
          </Panel>
        </Reveal>

        <Reveal delayMs={300}>
          <Panel title="Review Summary">
            {agency.reviewNotes ? (
              <div className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg px-3 py-2 text-sm text-warning-fg">
                <MessageSquareWarning className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-medium">
                    {agency.registrationStatus === 'REJECTED' ? 'Rejection reason' : 'Corrections requested'}
                  </p>
                  <p className="mt-1 text-foreground">{agency.reviewNotes}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground-muted">No validation notes recorded yet for this registration.</p>
            )}
          </Panel>
        </Reveal>

        <Reveal delayMs={400}>
          <Panel title="Actions">
            {isReviewable ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => setConfirmAction('approve')}>
                  <Check className="size-3.5" />
                  Approve Registration
                </Button>
                <Button variant="danger" onClick={() => setConfirmAction('reject')}>
                  <X className="size-3.5" />
                  Reject Registration
                </Button>
                <Button variant="secondary" onClick={() => setConfirmAction('resubmission')}>
                  <RotateCcw className="size-3.5" />
                  Request Resubmission
                </Button>
              </div>
            ) : agency.registrationStatus === 'REJECTED' ? (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-foreground-muted">This registration was rejected.</p>
                <Button variant="secondary" size="sm" onClick={() => setConfirmAction('reopen')}>
                  <RotateCcw className="size-3.5" />
                  Reopen for Review
                </Button>
              </div>
            ) : (
              <p className="text-sm text-foreground-muted">This registration has already been approved. No further action is needed.</p>
            )}
          </Panel>
        </Reveal>
      </div>

      {viewerStartIndex !== null ? (
        <AgencyDocumentViewer
          documents={agency.documents}
          startIndex={viewerStartIndex}
          onClose={() => setViewerStartIndex(null)}
        />
      ) : null}

      <Modal
        open={confirmAction === 'approve'}
        onClose={closeConfirm}
        title="Confirm Approval"
        footer={
          <>
            <Button variant="outline" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Confirm Approval</Button>
          </>
        }
      >
        <p>
          Approve <strong>{agency.name}</strong>'s registration? Its account status will be set to <strong>ACTIVE</strong> and
          the agency admin will be able to sign in.
        </p>
      </Modal>

      <Modal
        open={confirmAction === 'reject'}
        onClose={closeConfirm}
        title="Reject Registration"
        footer={
          <>
            <Button variant="outline" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button variant="danger" disabled={!reasonText.trim()} onClick={handleConfirm}>
              Confirm Rejection
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <p>
            Reject <strong>{agency.name}</strong>'s registration? Provide a reason so the agency admin knows what went wrong.
          </p>
          <textarea
            value={reasonText}
            onChange={(event) => setReasonText(event.target.value)}
            placeholder="e.g. Submitted documents do not match the agency name on file."
            rows={4}
            className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />
        </div>
      </Modal>

      <Modal
        open={confirmAction === 'resubmission'}
        onClose={closeConfirm}
        title="Request Resubmission"
        footer={
          <>
            <Button variant="outline" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button variant="secondary" disabled={!reasonText.trim()} onClick={handleConfirm}>
              Send Resubmission Request
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <p>
            Ask <strong>{agency.name}</strong> to correct and resubmit specific information. Describe exactly what needs to be
            fixed.
          </p>
          <textarea
            value={reasonText}
            onChange={(event) => setReasonText(event.target.value)}
            placeholder="e.g. Please resubmit a proof of address issued in the agency's name."
            rows={4}
            className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />
        </div>
      </Modal>

      <Modal
        open={confirmAction === 'reopen'}
        onClose={closeConfirm}
        title="Reopen for Review"
        footer={
          <>
            <Button variant="outline" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Confirm</Button>
          </>
        }
      >
        <p>
          Move <strong>{agency.name}</strong>'s registration back to <strong>Pending Review</strong> for another pass?
        </p>
      </Modal>
    </>
  )
}
