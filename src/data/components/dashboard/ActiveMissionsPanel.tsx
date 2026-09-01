import { Navigation } from 'lucide-react'
import { Panel, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, PriorityBadge, MissionStatusBadge, EmptyState } from '../ui'
import { formatDateTime } from '../../lib/formatDateTime'
import type { MissionListItem } from './types'

interface ActiveMissionsPanelProps {
  missions: MissionListItem[]
}

export function ActiveMissionsPanel({ missions }: ActiveMissionsPanelProps) {
  return (
    <Panel title="Active Missions">
      {missions.length === 0 ? (
        <EmptyState icon={Navigation} title="No active missions" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Responder</TableHead>
              <TableHead>Incident</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dispatched</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {missions.map((mission) => (
              <TableRow key={mission.id}>
                <TableCell>{mission.responderName}</TableCell>
                <TableCell>
                  <PriorityBadge priority={mission.incidentPriority} />
                </TableCell>
                <TableCell>
                  <MissionStatusBadge status={mission.status} />
                </TableCell>
                <TableCell className="text-foreground-secondary">{formatDateTime(mission.dispatchedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}
