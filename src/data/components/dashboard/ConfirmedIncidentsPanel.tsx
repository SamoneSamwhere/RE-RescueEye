import { ShieldCheck } from 'lucide-react'
import { Panel, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, PriorityBadge, Badge, EmptyState } from '../ui'
import { formatDateTime } from '../../../lib/formatDateTime'
import { DETECTION_CATEGORY_LABEL, INCIDENT_STATUS_LABEL } from '../../../lib/labels'
import type { IncidentListItem } from './types'

interface ConfirmedIncidentsPanelProps {
  incidents: IncidentListItem[]
}

export function ConfirmedIncidentsPanel({ incidents }: ConfirmedIncidentsPanelProps) {
  return (
    <Panel title="Confirmed Incidents">
      {incidents.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No confirmed incidents" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Priority</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verified</TableHead>
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
                <TableCell className="text-foreground-secondary">{formatDateTime(incident.verifiedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}
