import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { Panel } from '../components/ui'
import { MissionHistoryTable } from '../components/agency-admin'
import { useAgencyAdminData } from '../features/agency-admin'

export function AgencyAdminMissionHistoryPage() {
  const { missionHistory } = useAgencyAdminData()

  return (
    <>
      <PageHeader
        title="Mission History"
        description="Missions previously handled by this agency's Field Responders."
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal>
          <Panel title={`Missions (${missionHistory.length})`}>
            <MissionHistoryTable missions={missionHistory} />
          </Panel>
        </Reveal>
      </div>
    </>
  )
}
