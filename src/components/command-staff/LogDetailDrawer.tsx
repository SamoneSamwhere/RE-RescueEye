import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface LogDetailDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Right-hand drawer for inspecting one log entry without leaving the log. The
 * table stays visible and keeps its scroll position and filters, so you can
 * click down the list. Esc, the X, or a click on the dimmed area closes it.
 */
export function LogDetailDrawer({ open, onClose, title, children }: LogDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    drawerRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!open) return null

  const portalTarget = document.querySelector<HTMLElement>('[data-theme]') ?? document.body

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end bg-surface-inverse/40 motion-safe:animate-fade-in" onClick={onClose}>
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-xl focus:outline-none"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-sm p-1 text-foreground-muted transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    portalTarget,
  )
}
