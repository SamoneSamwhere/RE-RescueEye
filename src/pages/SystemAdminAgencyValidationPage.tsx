import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { AgencyValidationList } from '../components/system-admin'
import { useSystemAdminData } from '../features/system-admin'

export function SystemAdminAgencyValidationPage() {
  const { agencies, resubmitAgency } = useSystemAdminData()

  const pendingAgencies = agencies
    .filter((a) => a.registrationStatus === 'PENDING')
    .sort((a, b) => a.registeredAt.localeCompare(b.registeredAt))
  const resubmissionRequiredAgencies = agencies
    .filter((a) => a.registrationStatus === 'RESUBMISSION_REQUIRED')
    .sort((a, b) => (b.reviewedAt ?? '').localeCompare(a.reviewedAt ?? ''))
  const rejectedAgencies = agencies
    .filter((a) => a.registrationStatus === 'REJECTED')
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))

  return (
    <>
      <PageHeader
        title="Agency Validation"
        description="Review pending agency registrations, inspect submitted documents, and record a decision."
      />
      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal>
          <AgencyValidationList
            pendingAgencies={pendingAgencies}
            resubmissionRequiredAgencies={resubmissionRequiredAgencies}
            rejectedAgencies={rejectedAgencies}
            onResubmit={resubmitAgency}
          />
        </Reveal>
      </div>
    </>
  )
}
