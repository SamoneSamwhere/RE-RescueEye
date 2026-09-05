import { Video } from 'lucide-react'
import { Panel, Button } from '../ui'
import { cn } from '../../../lib/cn'

interface LiveFeedPlaceholderProps {
  droneName: string
  isLive: boolean
  onToggleLive: () => void
  onSaveToHistory: () => void
  title?: string
}

export function LiveFeedPlaceholder({
  droneName,
  isLive,
  onToggleLive,
  onSaveToHistory,
  title = 'Live Feed',
}: LiveFeedPlaceholderProps) {
  return (
    <Panel title={title}>
      <div className="flex flex-col gap-3">
        <div className="relative flex h-56 flex-col items-center justify-center gap-2 overflow-hidden rounded-md border border-border bg-surface-inverse">
          {isLive ? (
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-sm bg-danger px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-foreground-inverse">
              <span className="size-1.5 animate-pulse rounded-full bg-foreground-inverse" />
              Live
            </span>
          ) : null}
          <Video className={cn('size-10', isLive ? 'text-foreground-inverse' : 'text-foreground-muted')} />
          <p className="text-sm text-foreground-inverse/80">
            {isLive ? `Streaming from ${droneName} (mock preview)` : 'Feed not started'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={isLive ? 'danger' : 'primary'} onClick={onToggleLive}>
            {isLive ? 'Stop Feed' : 'Start Feed'}
          </Button>
          <Button variant="outline" disabled={!isLive} onClick={onSaveToHistory}>
            Save to Media History
          </Button>
        </div>
      </div>
    </Panel>
  )
}
