import { BarChart3, History } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, PriorityBadge, EmptyState } from '../ui'
import { formatDateTime } from '../../../lib/formatDateTime'

interface ClassificationRecord {
  detectionId: string
  category: string
  damageClassification?: string
  confidence: number
  priority: string
  verifiedAt: string
  verifiedByUserName: string
  detectedAt: string
}

interface CommandStaffClassificationTableProps {
  records: ClassificationRecord[]
  selectedId?: string
  onSelect?: (detectionId: string) => void
}

export function CommandStaffClassificationTable({ records, selectedId, onSelect }: CommandStaffClassificationTableProps) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No classifications"
        description="Verified detections will appear here."
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Detection ID</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Damage Level</TableHead>
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
            <TableCell className="font-medium text-foreground">{record.category}</TableCell>
            <TableCell>
              {record.damageClassification ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                  <BarChart3 className="size-3" />
                  {record.damageClassification}
                </span>
              ) : (
                <span className="text-foreground/50">—</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <div className="h-2 w-16 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${record.confidence}%` }}
                  />
                </div>
                <span className="text-xs text-foreground/70">{Math.round(record.confidence)}%</span>
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
