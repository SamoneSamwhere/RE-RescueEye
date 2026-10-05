import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  label?: string
}

export function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-foreground-muted">
      <Loader2 className="size-6 animate-spin text-accent" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
