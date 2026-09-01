import { AlertTriangle, Eye, FileText } from 'lucide-react'
import { Badge } from '../ui'
import { formatDateTime } from '../../lib/formatDateTime'
import type { AgencyDocument } from '../../types/agency'

interface AgencyDocumentCardProps {
  label: string
  required: boolean
  document?: AgencyDocument
  onView?: () => void
}

/** One verification-document slot: a submitted file's thumbnail, or a clear "missing" state for required documents. */
export function AgencyDocumentCard({ label, required, document, onView }: AgencyDocumentCardProps) {
  if (!document) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-danger-border bg-danger-bg/40 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {required ? <Badge tone="danger">Missing</Badge> : <Badge tone="neutral">Not submitted</Badge>}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-4 text-center text-danger-fg">
          <AlertTriangle className="size-5" />
          <p className="text-xs">{required ? 'Required document not submitted' : 'Optional document not submitted'}</p>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onView}
      className="group flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-3 text-left transition-colors motion-safe:transition-transform motion-safe:duration-150 hover:border-border-strong hover:bg-surface-secondary motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {required ? <Badge tone="success">Submitted</Badge> : <Badge tone="neutral">Optional</Badge>}
      </div>

      <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-sm border border-border bg-surface-secondary">
        {document.fileType === 'image' ? (
          <img src={document.url} alt={document.label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-foreground-muted">
            <FileText className="size-8" />
            <span className="text-xs font-medium uppercase tracking-wide">PDF</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-surface-inverse/0 opacity-0 transition-all group-hover:bg-surface-inverse/30 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground shadow-panel">
            <Eye className="size-3.5" />
            View
          </span>
        </div>
      </div>

      <p className="truncate text-xs text-foreground-muted">
        {document.fileName} · {formatDateTime(document.uploadedAt)}
      </p>
    </button>
  )
}
