import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  actions?: ReactNode
}

/**
 * Structural container for operational sections (live feed, map, queue).
 * Distinct from Card: an eyebrow-style header bar with an actions slot,
 * meant for persistent screen regions rather than general content blocks.
 */
export function Panel({ title, actions, className, children, ...props }: PanelProps) {
  return (
    <div
      className={cn('flex flex-col rounded-md border border-border bg-surface shadow-panel', className)}
      {...props}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          {title}
        </h2>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className="flex-1 px-4 py-3">{children}</div>
    </div>
  )
}
