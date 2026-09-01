import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Mail, Phone, Clock, RotateCcw, Search } from 'lucide-react'
import { Card, Button, Badge, EmptyState } from '../ui'
import { formatDateTime } from '../../../lib/formatDateTime'
import { AGENCY_REGISTRATION_STATUS_LABEL, AGENCY_REGISTRATION_STATUS_TONE } from '../../../lib/labels'
import { systemAdminAgencyValidationDetailPath } from '../../../routes/paths'
import type { Agency } from '../../types/agency'

interface AgencyValidationListProps {
  pendingAgencies: Agency[]
  resubmissionRequiredAgencies: Agency[]
  rejectedAgencies: Agency[]
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
  resubmissionRequiredAgencies,
  rejectedAgencies,
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
              <Badge tone={AGENCY_REGISTRATION_STATUS_TONE[agency.registrationStatus]}>
                {AGENCY_REGISTRATION_STATUS_LABEL[agency.registrationStatus]}
              </Badge>
              <Link
                to={systemAdminAgencyValidationDetailPath(agency.id)}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-accent bg-accent px-2 text-xs font-medium text-foreground-inverse hover:bg-accent-hover"
              >
                <Search className="size-3.5" />
                Review Registration
              </Link>
            </AgencyRow>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          Resubmission Required ({resubmissionRequiredAgencies.length})
        </p>
        {resubmissionRequiredAgencies.length === 0 ? (
          <EmptyState icon={Building2} title="No agencies awaiting resubmission" />
        ) : (
          resubmissionRequiredAgencies.map((agency) => (
            <AgencyRow key={agency.id} agency={agency}>
              <Badge tone={AGENCY_REGISTRATION_STATUS_TONE[agency.registrationStatus]}>
                {AGENCY_REGISTRATION_STATUS_LABEL[agency.registrationStatus]}
              </Badge>
              <Link
                to={systemAdminAgencyValidationDetailPath(agency.id)}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface-secondary px-2 text-xs font-medium text-foreground hover:bg-border"
              >
                <Search className="size-3.5" />
                Review Registration
              </Link>
            </AgencyRow>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          Rejected ({rejectedAgencies.length})
        </p>
        {rejectedAgencies.length === 0 ? (
          <EmptyState icon={Building2} title="No rejected agencies" />
        ) : (
          rejectedAgencies.map((agency) => (
            <AgencyRow key={agency.id} agency={agency}>
              <Badge tone={AGENCY_REGISTRATION_STATUS_TONE[agency.registrationStatus]}>
                {AGENCY_REGISTRATION_STATUS_LABEL[agency.registrationStatus]}
              </Badge>
              <Link
                to={systemAdminAgencyValidationDetailPath(agency.id)}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface-secondary px-2 text-xs font-medium text-foreground hover:bg-border"
              >
                <Search className="size-3.5" />
                View Details
              </Link>
              <Button size="sm" variant="secondary" onClick={() => onResubmit(agency.id)}>
                <RotateCcw className="size-3.5" />
                Reopen for Review
              </Button>
            </AgencyRow>
          ))
        )}
      </div>
    </div>
  )
}
