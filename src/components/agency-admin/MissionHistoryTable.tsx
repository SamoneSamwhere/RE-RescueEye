import { History } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, PriorityBadge, MissionStatusBadge, EmptyState } from '../ui'
import { formatDateTime } from '../../lib/formatDateTime'
import type { MissionHistoryItem } from '../../features/agency-admin'

interface MissionHistoryTableProps {
  missions: MissionHistoryItem[]
}

export function MissionHistoryTable({ missions }: MissionHistoryTableProps) {
  if (missions.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No mission history"
        description="Missions handled by this agency's Field Responders will appear here."
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Responder</TableHead>
          <TableHead>Incident Priority</TableHead>
          <TableHead>Mission Status</TableHead>
          <TableHead>Dispatched</TableHead>
          <TableHead>Completed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {missions.map((mission) => (
          <TableRow key={mission.id}>
            <TableCell className="font-medium text-foreground">{mission.responderName}</TableCell>
            <TableCell>{mission.incidentPriority ? <PriorityBadge priority={mission.incidentPriority} /> : '—'}</TableCell>
            <TableCell>
              <MissionStatusBadge status={mission.status} />
            </TableCell>
            <TableCell>{formatDateTime(mission.dispatchedAt)}</TableCell>
            <TableCell>{mission.completedAt ? formatDateTime(mission.completedAt) : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
