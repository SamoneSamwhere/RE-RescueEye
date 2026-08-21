import type { ReactNode } from 'react'
import { Building2, Mail, Phone, Clock, Check, X, RotateCcw } from 'lucide-react'
import { Card, Button, Badge, EmptyState } from '../ui'
import { formatDateTime } from '../../lib/formatDateTime'
import type { Agency } from '../../types/agency'

interface AgencyValidationListProps {
  pendingAgencies: Agency[]
  rejectedAgencies: Agency[]
  onApprove: (agencyId: string) => void
  onReject: (agencyId: string) => void
  onResubmit: (agencyId: string) => void
}

function AgencyRow({ agency, children }: { agency: Agency; children: ReactNode }) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{agency.name}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-muted">
          <span className="flex items-center gap-1">
            <Mail className="size-3" />
            {agency.contactEmail}
          </span>
          {agency.contactPhone ? (
            <span className="flex items-center gap-1">
              <Phone className="size-3" />
              {agency.contactPhone}
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            Registered {formatDateTime(agency.registeredAt)}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </Card>
  )
}

export function AgencyValidationList({
  pendingAgencies,
  rejectedAgencies,
  onApprove,
  onReject,
  onResubmit,
}: AgencyValidationListProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          Pending Review ({pendingAgencies.length})
        </p>
        {pendingAgencies.length === 0 ? (
          <EmptyState icon={Building2} title="No agencies awaiting review" />
        ) : (
          pendingAgencies.map((agency) => (
            <AgencyRow key={agency.id} agency={agency}>
              <Badge tone="warning">Pending</Badge>
              <Button size="sm" variant="danger" onClick={() => onReject(agency.id)}>
                <X className="size-3.5" />
                Reject
              </Button>
              <Button size="sm" onClick={() => onApprove(agency.id)}>
                <Check className="size-3.5" />
                Approve
              </Button>
            </AgencyRow>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          Rejected — Awaiting Resubmission ({rejectedAgencies.length})
        </p>
        {rejectedAgencies.length === 0 ? (
          <EmptyState icon={Building2} title="No rejected agencies" />
        ) : (
          rejectedAgencies.map((agency) => (
            <AgencyRow key={agency.id} agency={agency}>
              <Badge tone="danger">Rejected</Badge>
              <Button size="sm" variant="secondary" onClick={() => onResubmit(agency.id)}>
                <RotateCcw className="size-3.5" />
                Resubmit for Review
              </Button>
            </AgencyRow>
          ))
        )}
      </div>
    </div>
  )
}
