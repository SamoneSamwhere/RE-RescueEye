import { useRef } from 'react'
import { AlertCircle, CheckCircle2, Upload, X } from 'lucide-react'
import { cn } from '../../../lib/cn'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
const ACCEPTED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DocumentUploadFieldProps {
  id: string
  label: string
  hint?: string
  required?: boolean
  file: File | null
  error: string | null
  onChange: (file: File | null, error: string | null) => void
}

/** A single required/optional document slot: dropzone-style trigger, then filename + size + remove once selected, or an inline error state. */
export function DocumentUploadField({ id, label, hint, required, file, error, onChange }: DocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(fileList: FileList | null) {
    const selected = fileList?.[0]
    if (!selected) return

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      onChange(null, 'Unsupported file type. Upload a PDF, PNG, or JPG.')
      return
    }
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      onChange(null, 'File is too large. Maximum size is 10 MB.')
      return
    }

    onChange(selected, null)
  }

  function handleRemove() {
    onChange(null, null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex h-full flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
        {label}
        {required ? (
          <span className="ml-1 text-danger">*</span>
        ) : (
          <span className="ml-1 normal-case text-foreground-muted">(optional)</span>
        )}
      </label>
      {hint ? <p className="text-xs text-foreground-muted">{hint}</p> : null}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={(event) => handleFiles(event.target.files)}
        className="sr-only"
      />

      {file ? (
        <div className="mt-auto flex items-center justify-between gap-2 rounded-md border border-success-border bg-success-bg px-3 py-2 motion-safe:animate-pop-in">
          <div className="flex min-w-0 items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-success" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-success-fg">{file.name}</p>
              <p className="text-xs text-success-fg/70">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            aria-label={`Remove ${file.name}`}
            className="shrink-0 rounded-sm p-1 text-success-fg transition-colors hover:bg-success-border/50"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            'mt-auto flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm transition-colors',
            error
              ? 'border-danger-border bg-danger-bg text-danger-fg hover:bg-danger-bg/70 motion-safe:animate-shake'
              : 'border-border-strong text-foreground-secondary hover:border-accent-border hover:bg-accent-subtle hover:text-accent',
          )}
        >
          {error ? <AlertCircle className="size-4 shrink-0" /> : <Upload className="size-4 shrink-0" />}
          <span>{error ?? 'Click to upload (PDF, PNG, or JPG — max 10MB)'}</span>
        </label>
      )}
    </div>
  )
}
