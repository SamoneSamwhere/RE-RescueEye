import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { Panel } from '../components/ui'
import { UserStatusTable } from '../components/agency-admin'
import { useAgencyAdminData } from '../features/agency-admin'

export function AgencyAdminAccountStatusPage() {
  const { agencyUsers, setUserStatus } = useAgencyAdminData()
  const location = useLocation()
  const [highlightUserId, setHighlightUserId] = useState<string | undefined>(
    (location.state as { highlightUserId?: string } | null)?.highlightUserId,
  )

  useEffect(() => {
    if (!highlightUserId) return
    const timeout = setTimeout(() => setHighlightUserId(undefined), 3000)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <PageHeader
        title="Account Status Management"
        description="Activate or deactivate your agency's Command Staff and Field Responder accounts."
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal>
          <Panel title={`Users (${agencyUsers.length})`}>
            <UserStatusTable users={agencyUsers} onSetStatus={setUserStatus} highlightUserId={highlightUserId} />
          </Panel>
        </Reveal>
      </div>
    </>
  )
}
