import { useState } from 'react'
import { CheckCircle2, ShieldCheck, Send } from 'lucide-react'
import { Modal, Button } from '../ui'
import { ResponderSelectionPanel } from '../responders'
import type { ResponderCandidate } from '../responders'
import type { IncidentPriority } from '../../../types/incident'

const PRIORITY_OPTIONS: IncidentPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export interface VerifyDispatchSubmit {
  priority: IncidentPriority
  notes: string
  responderIds: string[]
}

interface VerifyDispatchModalProps {
  open: boolean
  onClose: () => void
  /**
   * 'verify' — a pending detection: review it, set the incident priority, and
   * optionally alert responders, all in one step.
   * 'dispatch' — already verified: only alert (more) responders.
   */
  mode: 'verify' | 'dispatch'
  /** Seeds the priority field — the AI's suggestion, which Command Staff can override. */
  suggestedPriority: IncidentPriority
  candidates: ResponderCandidate[]
  /** True once the incident already has a response team — new picks join it. */
  hasTeam: boolean
  onSubmit: (input: VerifyDispatchSubmit) => void
}

/**
 * Everything Command Staff decide about one detection, in one window: the
 * human review (notes + incident priority) and which responders to alert.
 * Keeping it out of the detail panel means the evidence stays in view on the
 * page and nobody has to scroll past it to reach the responder list.
 *
 * Mounted only while open (the parent renders it conditionally), so every
 * opening starts from a clean form.
 */
export function VerifyDispatchModal({
  open,
  onClose,
  mode,
  suggestedPriority,
  candidates,
  hasTeam,
  onSubmit,
}: VerifyDispatchModalProps) {
  const [priority, setPriority] = useState<IncidentPriority>(suggestedPriority)
  const [notes, setNotes] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const selectedCount = candidates.filter((c) => c.isAvailable && selectedIds.includes(c.id)).length
  const isVerify = mode === 'verify'

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function submit() {
    onSubmit({
      priority,
      notes,
      responderIds: candidates.filter((c) => c.isAvailable && selectedIds.includes(c.id)).map((c) => c.id),
    })
  }

  const submitLabel = isVerify
    ? selectedCount > 0
      ? `Verify & Alert ${selectedCount} ${selectedCount === 1 ? 'Responder' : 'Responders'}`
      : 'Verify Without Alerting'
    : `Alert ${selectedCount} ${selectedCount === 1 ? 'Responder' : 'Responders'}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isVerify ? 'Verify & Dispatch' : 'Alert Responders'}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!isVerify && selectedCount === 0}>
            {isVerify ? <CheckCircle2 className="size-4" /> : <Send className="size-4" />}
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
        {isVerify ? (
          <div className="rounded-md border border-border bg-surface px-4 py-3">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
              <ShieldCheck className="size-3.5" />
              Human Review
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="verify-notes"
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-foreground-secondary"
                >
                  Reviewer Notes
                </label>
                <textarea
                  id="verify-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={2}
                  placeholder="Optional"
                  className="w-full rounded-md border border-border-strong bg-surface px-2 py-2 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="verify-priority"
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-foreground-secondary"
                >
                  Incident Priority
                </label>
                <select
                  id="verify-priority"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as IncidentPriority)}
                  className="h-9 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-foreground-muted">
                  Prefilled from the AI&apos;s assessment — change it if it looks wrong.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <ResponderSelectionPanel candidates={candidates} selectedIds={selectedIds} onToggle={toggle} hasTeam={hasTeam} />

        <p className="text-xs text-foreground-muted">
          {isVerify
            ? 'Verifying confirms an incident. Anyone you select gets a mock SMS, and each mission starts as PENDING.'
            : 'Each selected responder gets a mock SMS, and each mission starts as PENDING.'}
        </p>
      </div>
    </Modal>
  )
}
