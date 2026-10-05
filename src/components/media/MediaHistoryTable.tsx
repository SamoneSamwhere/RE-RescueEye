import { Archive, Radio, Upload } from 'lucide-react'
import { Panel, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, EmptyState } from '../ui'
import { formatDateTime } from '../../../lib/formatDateTime'
import type { MediaHistoryItem } from './types'

interface MediaHistoryTableProps {
  items: MediaHistoryItem[]
}

export function MediaHistoryTable({ items }: MediaHistoryTableProps) {
  return (
    <Panel title="Media Storage & History">
      {items.length === 0 ? (
        <EmptyState icon={Archive} title="No media stored yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Drone</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Captured</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Badge tone={item.sourceType === 'LIVE_FEED' ? 'info' : 'neutral'}>
                    <span className="mr-1 inline-flex">
                      {item.sourceType === 'LIVE_FEED' ? <Radio className="size-3" /> : <Upload className="size-3" />}
                    </span>
                    {item.sourceType === 'LIVE_FEED' ? 'Live Feed' : 'Uploaded Video'}
                  </Badge>
                </TableCell>
                <TableCell className="text-foreground-secondary">{item.droneName ?? '—'}</TableCell>
                <TableCell className="text-foreground-secondary">{item.uploadedByName ?? '—'}</TableCell>
                <TableCell className="text-foreground-secondary">{formatDateTime(item.capturedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}
