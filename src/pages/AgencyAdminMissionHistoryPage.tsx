import { AppShell, PageHeader } from '../components/layout'
import { Panel } from '../components/ui'
import { MissionHistoryTable } from '../components/agency-admin'
import { useAuth } from '../features/auth'
import { AGENCY_ADMIN_NAV_ITEMS, useAgencyAdminData } from '../features/agency-admin'

export function AgencyAdminMissionHistoryPage() {
  const { session, logout } = useAuth()
  const { missionHistory } = useAgencyAdminData()

  if (!session) return null

  return (
    <AppShell
      user={{ name: session.name, role: session.role, agencyName: session.agencyName }}
      navItems={AGENCY_ADMIN_NAV_ITEMS}
      onLogout={logout}
    >
      <PageHeader
        title="Mission History"
        description="Missions previously handled by this agency's Field Responders."
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Panel title={`Missions (${missionHistory.length})`}>
          <MissionHistoryTable missions={missionHistory} />
        </Panel>
      </div>
    </AppShell>
  )
}
