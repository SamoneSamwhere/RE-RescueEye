import { useRef, useState } from 'react'
import { FileVideo, UploadCloud } from 'lucide-react'
import { Panel, Button } from '../ui'

interface UploadVideoPlaceholderProps {
  droneName: string
  onUpload: (fileName: string) => void
}

/** Mock only — captures a file's name for display, never reads or processes its contents. */
export function UploadVideoPlaceholder({ droneName, onUpload }: UploadVideoPlaceholderProps) {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setSelectedFileName(file ? file.name : null)
  }

  function handleUpload() {
    if (!selectedFileName) return
    onUpload(selectedFileName)
    setSelectedFileName(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <Panel title="Upload Recorded Video">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-56 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border-strong bg-surface-secondary text-center transition-colors hover:bg-border/40"
        >
          {selectedFileName ? (
            <>
              <FileVideo className="size-10 text-accent" />
              <p className="text-sm font-medium text-foreground">{selectedFileName}</p>
              <p className="text-xs text-foreground-muted">Ready to upload from {droneName}</p>
            </>
          ) : (
            <>
              <UploadCloud className="size-10 text-foreground-muted" />
              <p className="text-sm text-foreground-secondary">Click to select a recorded video file</p>
              <p className="text-xs text-foreground-muted">Mock upload — file contents are not processed</p>
            </>
          )}
        </button>
        <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
        <div>
          <Button disabled={!selectedFileName} onClick={handleUpload}>
            Upload Video
          </Button>
        </div>
      </div>
    </Panel>
  )
}
