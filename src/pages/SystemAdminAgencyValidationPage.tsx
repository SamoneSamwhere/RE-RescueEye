import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { AgencyValidationList } from '../components/system-admin'
import { useSystemAdminData } from '../features/system-admin'

export function SystemAdminAgencyValidationPage() {
  const { agencies, approveAgency, rejectAgency, resubmitAgency } = useSystemAdminData()

  const pendingAgencies = agencies
    .filter((a) => a.registrationStatus === 'PENDING')
    .sort((a, b) => a.registeredAt.localeCompare(b.registeredAt))
  const rejectedAgencies = agencies
    .filter((a) => a.registrationStatus === 'REJECTED')
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))

  return (
    <>
      <PageHeader
        title="Agency Validation"
        description="Review pending agency registrations, and resubmit rejected ones for another pass."
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal>
          <AgencyValidationList
            pendingAgencies={pendingAgencies}
            rejectedAgencies={rejectedAgencies}
            onApprove={approveAgency}
            onReject={rejectAgency}
            onResubmit={resubmitAgency}
          />
        </Reveal>
      </div>
    </>
  )
}
