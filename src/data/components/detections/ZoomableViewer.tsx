import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode, WheelEvent } from 'react'
import { createPortal } from 'react-dom'
import { Maximize, X, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '../../../lib/cn'

const MIN_SCALE = 1
const MAX_SCALE = 8
const STEP = 1.5

interface ZoomableViewerProps {
  open: boolean
  onClose: () => void
  title: string
  /** Whatever should be magnified — an <img>, or a frame with overlays that must zoom with it. */
  children: ReactNode
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Full-screen zoom + pan viewer. Content is scaled with a CSS transform rather
 * than re-rendered, so overlays inside `children` (e.g. the AI bounding box)
 * stay glued to the image at every zoom level.
 */
export function ZoomableViewer({ open, onClose, title, children }: ZoomableViewerProps) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  // Set once a press has travelled far enough to be a drag, so the click that follows it is not a backdrop click.
  const didDrag = useRef(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  function zoomTo(next: number) {
    const clamped = clamp(next, MIN_SCALE, MAX_SCALE)
    setScale(clamped)
    // Nothing to pan to at 1x, so recentre rather than strand the image off to one side.
    if (clamped === MIN_SCALE) setOffset({ x: 0, y: 0 })
  }

  function reset() {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
      else if (event.key === '+' || event.key === '=') setScale((s) => clamp(s * STEP, MIN_SCALE, MAX_SCALE))
      else if (event.key === '-') setScale((s) => clamp(s / STEP, MIN_SCALE, MAX_SCALE))
      else if (event.key === '0') {
        setScale(1)
        setOffset({ x: 0, y: 0 })
      }
    }
    document.addEventListener('keydown', onKeyDown)
    dialogRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  if (!open) return null

  function onWheel(event: WheelEvent) {
    zoomTo(scale * (event.deltaY < 0 ? 1.15 : 1 / 1.15))
  }

  function onPointerDown(event: ReactPointerEvent) {
    if (scale === MIN_SCALE) return
    event.currentTarget.setPointerCapture(event.pointerId)
    didDrag.current = false
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }
    setDragging(true)
  }

  function onPointerMove(event: ReactPointerEvent) {
    if (!drag.current) return
    if (Math.abs(event.clientX - drag.current.x) + Math.abs(event.clientY - drag.current.y) > 4) didDrag.current = true
    setOffset({
      x: drag.current.ox + event.clientX - drag.current.x,
      y: drag.current.oy + event.clientY - drag.current.y,
    })
  }

  function endDrag() {
    drag.current = null
    setDragging(false)
  }

  const portalTarget = document.querySelector<HTMLElement>('[data-theme]') ?? document.body

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 focus:outline-none motion-safe:animate-fade-in"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        <div className="flex items-center gap-1">
          <span className="mr-2 w-12 text-right text-xs tabular-nums text-white/70">{Math.round(scale * 100)}%</span>
          <ToolButton label="Zoom out" onClick={() => zoomTo(scale / STEP)} disabled={scale <= MIN_SCALE}>
            <ZoomOut className="size-4" />
          </ToolButton>
          <ToolButton label="Zoom in" onClick={() => zoomTo(scale * STEP)} disabled={scale >= MAX_SCALE}>
            <ZoomIn className="size-4" />
          </ToolButton>
          <ToolButton label="Reset zoom" onClick={reset} disabled={scale === MIN_SCALE}>
            <Maximize className="size-4" />
          </ToolButton>
          <ToolButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </ToolButton>
        </div>
      </div>

      {/* Clicking the empty backdrop closes; the image itself is never a close target. */}
      <div
        className={cn(
          'relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-4',
          scale > MIN_SCALE ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in',
        )}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => (scale === MIN_SCALE ? zoomTo(3) : reset())}
        onClick={(event) => {
          // Pointer capture retargets the click that ends a drag onto this element, so a drag must not count.
          if (event.target === event.currentTarget && !didDrag.current) onClose()
          didDrag.current = false
        }}
      >
        <div
          className="select-none motion-safe:transition-transform motion-safe:duration-100"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: dragging ? 'none' : undefined,
          }}
        >
          {children}
        </div>
      </div>

      <p className="shrink-0 pb-3 text-center text-xs text-white/50">
        Scroll or +/− to zoom · drag to pan · double-click to toggle · Esc to close
      </p>
    </div>,
    portalTarget,
  )
}

function ToolButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  )
}
