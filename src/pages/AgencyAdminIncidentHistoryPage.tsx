import { PageHeader } from '../data/components/layout'
import { Reveal } from '../data/components/landing/Reveal'
import { Panel } from '../data/components/ui'
import { IncidentHistoryTable } from '../data/components/agency-admin'
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
