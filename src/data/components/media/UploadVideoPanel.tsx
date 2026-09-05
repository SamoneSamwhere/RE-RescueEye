import { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, FileVideo, UploadCloud, X } from 'lucide-react'
import { Panel, Button } from '../ui'
import { cn } from '../../../lib/cn'

/** Mirrors ALLOWED_VIDEO_EXTS in api/services/media_store.py — keep the two in step. */
const ACCEPTED_EXTS = ['.mp4', '.mov', '.avi', '.mkv', '.ts', '.webm', '.m4v']

export interface UploadVideoPanelProps {
  droneName: string
  uploading: boolean
  progress: number
  error: string | null
  onUpload: (file: File) => void
  onCancel?: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function hasAcceptedExt(name: string): boolean {
  const lower = name.toLowerCase()
  return ACCEPTED_EXTS.some((ext) => lower.endsWith(ext))
}

/**
 * Real upload: sends the selected file to the API's media library and reports
 * progress. Replaces the earlier placeholder, which only captured a filename.
 *
 * The extension is checked here as well as server-side so an obviously wrong
 * file is rejected before a large body goes over the wire; the server remains
 * the authority.
 */
export function UploadVideoPanel({
  droneName,
  uploading,
  progress,
  error,
  onUpload,
  onCancel,
}: UploadVideoPanelProps) {
  const [file, setFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function selectFile(next: File | null) {
    if (!next) {
      setFile(null)
      return
    }
    if (!hasAcceptedExt(next.name)) {
      setLocalError(`Unsupported file type. Allowed: ${ACCEPTED_EXTS.join(', ')}`)
      setFile(null)
      return
    }
    setLocalError(null)
    setFile(next)
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    setDragging(false)
    if (uploading) return
    selectFile(event.dataTransfer.files?.[0] ?? null)
  }

  function handleUpload() {
    if (!file) return
    onUpload(file)
  }

  function clear() {
    setFile(null)
    setLocalError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const shownError = localError ?? error

  return (
    <Panel title="Upload Recorded Video">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            if (!uploading) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex h-56 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed bg-surface-secondary text-center transition-colors',
            dragging ? 'border-accent bg-accent-subtle' : 'border-border-strong hover:bg-border/40',
            uploading && 'cursor-not-allowed opacity-70',
          )}
        >
          {file ? (
            <>
              <FileVideo className="size-10 text-accent" />
              <p className="max-w-[85%] truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-foreground-muted">
                {formatBytes(file.size)} · will be stored against {droneName}
              </p>
            </>
          ) : (
            <>
              <UploadCloud className="size-10 text-foreground-muted" />
              <p className="text-sm text-foreground-secondary">Click to select a recorded video, or drop one here</p>
              <p className="text-xs text-foreground-muted">{ACCEPTED_EXTS.join(', ')}</p>
            </>
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTS.join(',')}
          className="hidden"
          onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
        />

        {uploading ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-foreground-secondary">
              <span>Uploading…</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* At 100% the bytes are sent but the server is still probing the
                file, so the request is not finished — say so rather than
                appearing to hang on a full bar. */}
            {progress === 100 ? (
              <p className="text-xs text-foreground-muted">Processing on the server…</p>
            ) : null}
          </div>
        ) : null}

        {shownError ? (
          <p className="flex items-start gap-1.5 text-xs text-danger">
            <AlertCircle className="mt-px size-3.5 shrink-0" />
            {shownError}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <Button disabled={!file || uploading} onClick={handleUpload}>
            {uploading ? 'Uploading…' : 'Upload Video'}
          </Button>
          {uploading && onCancel ? (
            <Button variant="ghost" size="md" onClick={onCancel}>
              <X className="size-3.5" />
              Cancel
            </Button>
          ) : null}
          {!uploading && file ? (
            <Button variant="ghost" size="md" onClick={clear}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>
    </Panel>
  )
}

/** Confirmation shown after a clip lands in the library. */
export function UploadSuccessNote({ name }: { name: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-success">
      <CheckCircle2 className="size-3.5 shrink-0" />
      {name} stored in the media library.
    </p>
  )
}
