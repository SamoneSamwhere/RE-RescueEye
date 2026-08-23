import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { Panel } from '../components/ui'
import { IncidentHistoryTable } from '../components/agency-admin'
import { useAgencyAdminData } from '../features/agency-admin'

export function AgencyAdminIncidentHistoryPage() {
  const { incidentHistory } = useAgencyAdminData()

  return (
    <>
      <PageHeader
        title="Incident History"
        description="Incidents previously handled by this agency's Field Responders."
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal>
          <Panel title={`Incidents (${incidentHistory.length})`}>
            <IncidentHistoryTable incidents={incidentHistory} />
          </Panel>
        </Reveal>
      </div>
    </>
  )
}
