import { Radio, Upload } from 'lucide-react'
import { Panel } from '../ui'
import { cn } from '../../../lib/cn'
import type { MediaSourceType } from '../../types/media'

interface FeedSourceSelectorProps {
  droneName: string
  selected: MediaSourceType | null
  onSelect: (source: MediaSourceType) => void
}

const OPTIONS: { value: MediaSourceType; label: string; description: string; icon: typeof Radio }[] = [
  {
    value: 'LIVE_FEED',
    label: 'Live Drone Feed',
    description: 'Stream the drone\'s live camera feed for real-time review.',
    icon: Radio,
  },
  {
    value: 'UPLOADED_VIDEO',
    label: 'Upload Recorded Video',
    description: 'Upload a video recorded earlier by this drone.',
    icon: Upload,
  },
]

export function FeedSourceSelector({ droneName, selected, onSelect }: FeedSourceSelectorProps) {
  return (
    <Panel title={`Select Feed Source — ${droneName}`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = selected === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-md border px-4 py-3 text-left transition-colors',
                isSelected
                  ? 'border-accent bg-accent-subtle'
                  : 'border-border-strong bg-surface hover:bg-surface-secondary',
              )}
            >
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-md',
                  isSelected ? 'bg-accent text-foreground-inverse' : 'bg-surface-secondary text-foreground-secondary',
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="text-sm font-medium text-foreground">{option.label}</span>
              <span className="text-xs text-foreground-secondary">{option.description}</span>
            </button>
          )
        })}
      </div>
    </Panel>
  )
}
