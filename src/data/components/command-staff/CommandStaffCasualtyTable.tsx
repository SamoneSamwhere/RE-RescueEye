import { AlertCircle, History } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, PriorityBadge, EmptyState } from '../ui'
import { formatDateTime } from '../../lib/formatDateTime'

interface CasualtyRecord {
  detectionId: string
  confidence: number
  priority: string
  verifiedAt: string
  verifiedByUserName: string
  detectedAt: string
}

interface CommandStaffCasualtyTableProps {
  records: CasualtyRecord[]
  selectedId?: string
  onSelect?: (detectionId: string) => void
}

export function CommandStaffCasualtyTable({ records, selectedId, onSelect }: CommandStaffCasualtyTableProps) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No casualty reports"
        description="Verified casualty detections will appear here."
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Detection ID</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Verified By</TableHead>
          <TableHead>Verified At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow
            key={record.detectionId}
            onClick={() => onSelect?.(record.detectionId)}
            className={onSelect ? 'cursor-pointer hover:bg-surface-secondary' : ''}
            data-selected={selectedId === record.detectionId}
          >
            <TableCell className="font-mono text-sm text-foreground/70">{record.detectionId}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <AlertCircle className="size-4 text-destructive" />
                <div className="flex items-center gap-1">
                  <div className="h-2 w-16 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full bg-destructive"
                      style={{ width: `${record.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs text-foreground/70">{Math.round(record.confidence)}%</span>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <PriorityBadge priority={record.priority as any} />
            </TableCell>
            <TableCell className="text-foreground">{record.verifiedByUserName}</TableCell>
            <TableCell className="text-foreground/70">{formatDateTime(record.verifiedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
