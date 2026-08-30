import { useEffect, useState } from 'react'
import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { AgencyValidationList } from '../components/system-admin'
import { useSystemAdminData } from '../features/system-admin'
import { useAgencyDatabase } from '../hooks/useAgencyDatabase'
import type { Agency } from '../types/agency'

export function SystemAdminAgencyValidationPage() {
  const { resubmitAgency } = useSystemAdminData()
  const { getAgencies } = useAgencyDatabase()
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAgencies = async () => {
      setIsLoading(true)
      try {
        const dbAgencies = await getAgencies()
        // Convert database records to Agency type with string IDs
        const convertedAgencies: Agency[] = dbAgencies.map((dbAgency) => ({
          id: String(dbAgency.id),
          name: dbAgency.name,
          agencyType: 'Unknown',
          address: '',
          contactEmail: '',
          agencyAdmin: {
            fullName: 'Unknown',
            position: 'Unknown',
            email: '',
            phone: '',
          },
          documents: [],
          registrationStatus: dbAgency.registrationStatus,
          accountStatus: dbAgency.subscriptionStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
          registeredAt: dbAgency.createdAt,
          reviewedByUserId: dbAgency.validatedBy ? String(dbAgency.validatedBy) : undefined,
          reviewedAt: dbAgency.validatedAt,
        }))
        setAgencies(convertedAgencies)
      } catch (error) {
        console.error('Failed to load agencies:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadAgencies()
  }, [getAgencies])

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
