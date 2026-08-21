import { ShieldOff } from 'lucide-react'

interface UnauthorizedStateProps {
  title?: string
  description?: string
}

export function UnauthorizedState({
  title = 'Access restricted',
  description = 'You do not have permission to view this section.',
}: UnauthorizedStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
      <ShieldOff className="size-8 text-foreground-muted" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="w-full max-w-sm text-sm text-foreground-muted">{description}</p>
    </div>
  )
}
