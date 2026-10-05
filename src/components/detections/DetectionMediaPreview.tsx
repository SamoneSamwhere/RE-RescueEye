import { useState } from 'react'
import { Sparkles, Video, Image as ImageIcon, ZoomIn } from 'lucide-react'
import { DETECTION_CATEGORY_LABEL } from '../../lib/labels'
import { MockDetectionScene } from './MockDetectionScene'
import { ZoomableViewer } from './ZoomableViewer'
import type { BoundingBox, DetectionCategory } from '../../types/detection'

interface DetectionMediaPreviewProps {
  category: DetectionCategory
  confidence: number
  boundingBox: BoundingBox
  isLiveFeed: boolean
  /** Real frame crop from the API; absent on mock detections. */
  snapshotUrl?: string
}

/**
 * The frame a detection was seen in, with the AI bounding box overlaid.
 * Deliberately styled as machine output (dashed accent box, monospace
 * confidence tag) — never mimics the solid, human-authored styling used once a
 * detection is reviewed. Click to open it in a zoomable viewer.
 *
 * Mock detections have no real image, so an illustrated aerial scene stands in
 * (see MockDetectionScene) and the badge says so.
 */
export function DetectionMediaPreview({
  category,
  confidence,
  boundingBox,
  isLiveFeed,
  snapshotUrl,
}: DetectionMediaPreviewProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)
  // A real crop is already centred on the subject, so the frame-relative
  // bounding box would sit in the wrong place over it — the crop *is* the box.
  const showCrop = !!snapshotUrl && !imageFailed

  const label = showCrop ? 'Detected Frame' : isLiveFeed ? 'Live Feed Frame (mock)' : 'Recorded Frame (mock)'
  const title = `${DETECTION_CATEGORY_LABEL[category]} · ${Math.round(confidence * 100)}% — ${label}`

  const boxOverlay = showCrop ? null : (
    <div
      className="absolute rounded-sm border-2 border-dashed border-accent"
      style={{
        left: `${boundingBox.x}%`,
        top: `${boundingBox.y}%`,
        width: `${boundingBox.width}%`,
        height: `${boundingBox.height}%`,
      }}
    >
      <span className="absolute -top-6 left-0 flex items-center gap-1 whitespace-nowrap rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-medium text-foreground-inverse">
        <Sparkles className="size-3" />
        {DETECTION_CATEGORY_LABEL[category]} · {Math.round(confidence * 100)}%
      </span>
    </div>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomOpen(true)}
        aria-label={`Zoom in on ${title}`}
        className="group relative h-64 w-full cursor-zoom-in overflow-hidden rounded-md border border-border bg-surface-inverse text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus xl:h-auto xl:min-h-32 xl:flex-1"
      >
        {showCrop ? (
          <img
            src={snapshotUrl}
            alt="Frame captured at detection"
            className="h-full w-full object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <>
            <MockDetectionScene category={category} boundingBox={boundingBox} />
            {boxOverlay}
          </>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-sm bg-surface-inverse/80 px-2 py-1 text-xs text-foreground-inverse/70">
          {isLiveFeed ? <Video className="size-3.5" /> : <ImageIcon className="size-3.5" />}
          {label}
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-sm bg-surface-inverse/80 px-2 py-1 text-xs text-foreground-inverse/80 opacity-70 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <ZoomIn className="size-3.5" />
          Click to zoom
        </div>
      </button>

      <ZoomableViewer open={zoomOpen} onClose={() => setZoomOpen(false)} title={title}>
        {showCrop ? (
          <img
            src={snapshotUrl}
            alt="Frame captured at detection"
            draggable={false}
            className="max-h-[calc(100vh-9rem)] max-w-[92vw] rounded-md object-contain"
          />
        ) : (
          <div className="relative aspect-video w-[min(92vw,calc((100vh-9rem)*16/9))] overflow-hidden rounded-md border border-white/10">
            <MockDetectionScene category={category} boundingBox={boundingBox} />
            {boxOverlay}
          </div>
        )}
      </ZoomableViewer>
    </>
  )
}
