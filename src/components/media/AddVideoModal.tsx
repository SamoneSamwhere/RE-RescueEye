import { useRef, useState } from 'react'
import { Film, Upload, X } from 'lucide-react'
import { Modal, Button } from '../ui'
import type { Drone } from '../../types/drone'

export interface AddVideoModalProps {
  open: boolean
  onClose: () => void
  /** Drones available to attribute the clip to. May be empty — attribution is optional. */
  drones: Drone[]
  /** Clips already stored, used to warn when the chosen file looks like one of them. */
  existingClips?: Array<{ name: string; sizeBytes: number }>
  onUpload: (file: File, droneId: string | undefined) => void
  uploading: boolean
  progress: number
  error: string | null
  onCancelUpload?: () => void
}

/**
 * Adds footage to the media library on its own terms.
 *
 * The existing upload path hangs off a drone card: pick a drone, open its feed
 * modal, upload. That makes footage unreachable whenever the drone list is
 * empty — which is exactly when someone has a clip and nothing else. Here the
 * file is the subject and the drone is an optional label on it.
 */
export function AddVideoModal({
  open,
  onClose,
  drones,
  existingClips = [],
  onUpload,
  uploading,
  progress,
  error,
  onCancelUpload,
}: AddVideoModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [droneId, setDroneId] = useState<string>('')

  const isDuplicate = file ? existingClips.some((c) => c.name === file.name && c.sizeBytes === file.size) : false

  function handleClose() {
    if (uploading) return
    setFile(null)
    setDroneId('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Video">
      <div className="flex flex-col gap-4">
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-secondary px-3 py-2">
              <Film className="size-4 shrink-0 text-foreground-muted" />
              <span className="flex-1 truncate text-sm text-foreground">{file.name}</span>
              {!uploading ? (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  aria-label="Remove selected file"
                  className="text-foreground-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" />
              Choose a video file
            </Button>
          )}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
            Attribute to drone (optional)
          </span>
          <select
            value={droneId}
            onChange={(e) => setDroneId(e.target.value)}
            disabled={uploading || drones.length === 0}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground disabled:opacity-60"
          >
            <option value="">
              {drones.length === 0 ? 'No drones available — leaving unattributed' : 'Unattributed'}
            </option>
            {drones.map((drone) => (
              <option key={drone.id} value={drone.id}>
                {drone.name}
              </option>
            ))}
          </select>
        </label>

        {isDuplicate && !uploading ? (
          <p className="rounded-md border border-warning-border bg-warning-bg px-3 py-2 text-sm text-warning-fg">
            A clip with this name and size is already in the library. Uploading it again will store a second copy.
          </p>
        ) : null}

        {uploading ? (
          <div className="flex flex-col gap-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
              <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-foreground-muted">Uploading… {progress}%</span>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          {uploading && onCancelUpload ? (
            <Button variant="outline" onClick={onCancelUpload}>
              Cancel upload
            </Button>
          ) : (
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            disabled={!file || uploading}
            onClick={() => file && onUpload(file, droneId || undefined)}
          >
            <Upload className="size-4" />
            {isDuplicate ? 'Upload anyway' : 'Upload'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
