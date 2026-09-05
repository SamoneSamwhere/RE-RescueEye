import { ScanSearch } from 'lucide-react'
import { Panel, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, DetectionStatusBadge, EmptyState } from '../ui'
import { formatDateTime } from '../../../lib/formatDateTime'
import { DETECTION_CATEGORY_LABEL } from '../../../lib/labels'
import type { DetectionListItem } from './types'

interface PendingDetectionsPanelProps {
  detections: DetectionListItem[]
}

export function PendingDetectionsPanel({ detections }: PendingDetectionsPanelProps) {
  return (
    <Panel title="Pending Detections Requiring Review">
      {detections.length === 0 ? (
        <EmptyState icon={ScanSearch} title="No detections awaiting review" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Detected</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detections.map((detection) => (
              <TableRow key={detection.id}>
                <TableCell>{DETECTION_CATEGORY_LABEL[detection.category]}</TableCell>
                <TableCell>{Math.round(detection.confidence * 100)}%</TableCell>
                <TableCell className="text-foreground-secondary">{detection.sourceLabel}</TableCell>
                <TableCell className="text-foreground-secondary">{formatDateTime(detection.detectedAt)}</TableCell>
                <TableCell>
                  <DetectionStatusBadge status={detection.validationStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}
