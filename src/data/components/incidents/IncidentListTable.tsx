import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, PriorityBadge, Badge, EmptyState } from '../ui'
import { formatDateTime } from '../../../lib/formatDateTime'
import { DETECTION_CATEGORY_LABEL, INCIDENT_STATUS_LABEL } from '../../../lib/labels'
import { commandStaffIncidentDetailPath } from '../../routes/paths'
import type { EnrichedIncident } from './types'

interface IncidentListTableProps {
  incidents: EnrichedIncident[]
}

export function IncidentListTable({ incidents }: IncidentListTableProps) {
  if (incidents.length === 0) {
    return <EmptyState icon={ShieldCheck} title="No incidents match these filters" />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Priority</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Verified</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {incidents.map((incident) => (
          <TableRow key={incident.id}>
            <TableCell>
              <PriorityBadge priority={incident.priority} />
            </TableCell>
            <TableCell>{DETECTION_CATEGORY_LABEL[incident.detectionCategory]}</TableCell>
            <TableCell>
              <Badge tone="neutral">{INCIDENT_STATUS_LABEL[incident.status] ?? incident.status}</Badge>
            </TableCell>
            <TableCell className="text-foreground-secondary">
              {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}
            </TableCell>
            <TableCell className="text-foreground-secondary">{formatDateTime(incident.verifiedAt)}</TableCell>
            <TableCell>
              <Link to={commandStaffIncidentDetailPath(incident.id)} className="text-sm font-medium text-accent hover:underline">
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
