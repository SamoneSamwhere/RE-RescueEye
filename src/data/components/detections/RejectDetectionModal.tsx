import { useState } from 'react'
import { XCircle } from 'lucide-react'
import { Modal, Button } from '../ui'

interface RejectDetectionModalProps {
  open: boolean
  onClose: () => void
  onReject: (notes: string) => void
}

/** Rejecting discards the detection — no incident is created. Mounted only while open, so the note starts empty. */
export function RejectDetectionModal({ open, onClose, onReject }: RejectDetectionModalProps) {
  const [notes, setNotes] = useState('')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reject Detection"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => onReject(notes)}>
            <XCircle className="size-4" />
            Reject
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <p className="text-foreground-secondary">No incident will be created from this detection.</p>
        <label htmlFor="reject-notes" className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
          Reason (recommended)
        </label>
        <textarea
          id="reject-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="e.g. Debris, not a person"
          className="w-full rounded-md border border-border-strong bg-surface px-2 py-2 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        />
      </div>
    </Modal>
  )
}
