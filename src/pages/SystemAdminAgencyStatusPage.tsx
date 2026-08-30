import { useEffect, useState } from 'react'
import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { Panel } from '../components/ui'
import { AgencyStatusTable } from '../components/system-admin'
import { useSystemAdminData } from '../features/system-admin'
import { useAgencyDatabase } from '../hooks/useAgencyDatabase'
import type { Agency } from '../types/agency'

export function SystemAdminAgencyStatusPage() {
  const { setAgencyAccountStatus } = useSystemAdminData()
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

  const approvedAgencies = agencies
    .filter((a) => a.registrationStatus === 'APPROVED')
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <PageHeader
        title="Agency Account Status Management"
        description="Activate or deactivate approved agencies. Deactivating never deletes the agency record."
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal>
          <Panel title={`Approved Agencies (${approvedAgencies.length})`}>
            <AgencyStatusTable agencies={approvedAgencies} onSetStatus={setAgencyAccountStatus} />
          </Panel>
        </Reveal>
      </div>
    </>
  )
}
