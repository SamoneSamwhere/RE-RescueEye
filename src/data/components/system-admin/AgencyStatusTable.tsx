import { Building2 } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, EmptyState } from '../ui'
import { formatDateTime } from '../../../lib/formatDateTime'
import type { Agency, AgencyAccountStatus } from '../../../types/agency'

interface AgencyStatusTableProps {
  agencies: Agency[]
  onSetStatus: (agencyId: string, status: AgencyAccountStatus) => void
}

export function AgencyStatusTable({ agencies, onSetStatus }: AgencyStatusTableProps) {
  if (agencies.length === 0) {
    return <EmptyState icon={Building2} title="No approved agencies yet" />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agency</TableHead>
          <TableHead>Contact Email</TableHead>
          <TableHead>Approved</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agencies.map((agency) => (
          <TableRow key={agency.id}>
            <TableCell className="font-medium text-foreground">{agency.name}</TableCell>
            <TableCell>{agency.contactEmail}</TableCell>
            <TableCell>{agency.reviewedAt ? formatDateTime(agency.reviewedAt) : '—'}</TableCell>
            <TableCell>
              <Badge tone={agency.accountStatus === 'ACTIVE' ? 'success' : 'neutral'}>
                {agency.accountStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              {agency.accountStatus === 'ACTIVE' ? (
                <Button size="sm" variant="danger" onClick={() => onSetStatus(agency.id, 'INACTIVE')}>
                  Deactivate
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => onSetStatus(agency.id, 'ACTIVE')}>
                  Activate
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
