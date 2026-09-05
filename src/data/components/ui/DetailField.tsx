import type { ComponentType } from 'react'

interface DetailFieldProps {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}

/** Icon + stacked label/value row — used across detail and profile panels. */
export function DetailField({ icon: Icon, label, value }: DetailFieldProps) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-foreground-muted" />
      <div>
        <p className="text-xs uppercase tracking-wide text-foreground-muted">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  )
}
