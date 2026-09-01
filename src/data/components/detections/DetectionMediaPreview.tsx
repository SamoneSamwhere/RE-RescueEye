import { Sparkles, Video, Image as ImageIcon } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { DETECTION_CATEGORY_LABEL } from '../../../lib/labels'
import type { BoundingBox, DetectionCategory } from '../../types/detection'

interface DetectionMediaPreviewProps {
  category: DetectionCategory
  confidence: number
  boundingBox: BoundingBox
  isLiveFeed: boolean
}

/**
 * Mock frame with the AI bounding box overlaid. Deliberately styled as
 * machine output (dashed accent box, monospace confidence tag) — never
 * mimics the solid, human-authored styling used once a detection is reviewed.
 */
export function DetectionMediaPreview({ category, confidence, boundingBox, isLiveFeed }: DetectionMediaPreviewProps) {
  return (
    <div className="relative h-72 overflow-hidden rounded-md border border-border bg-surface-inverse">
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-sm bg-surface-inverse/80 px-2 py-1 text-xs text-foreground-inverse/70">
        {isLiveFeed ? <Video className="size-3.5" /> : <ImageIcon className="size-3.5" />}
        {isLiveFeed ? 'Live Feed Frame (mock)' : 'Recorded Frame (mock)'}
      </div>

      <div className="flex h-full items-center justify-center">
        {isLiveFeed ? <Video className="size-12 text-foreground-inverse/20" /> : <ImageIcon className="size-12 text-foreground-inverse/20" />}
      </div>

      <div
        className="absolute rounded-sm border-2 border-dashed border-accent"
        style={{
          left: `${boundingBox.x}%`,
          top: `${boundingBox.y}%`,
          width: `${boundingBox.width}%`,
          height: `${boundingBox.height}%`,
        }}
      >
        <span
          className={cn(
            'absolute -top-6 left-0 flex items-center gap-1 whitespace-nowrap rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-medium text-foreground-inverse',
          )}
        >
          <Sparkles className="size-3" />
          {DETECTION_CATEGORY_LABEL[category]} · {Math.round(confidence * 100)}%
        </span>
      </div>
    </div>
  )
}
