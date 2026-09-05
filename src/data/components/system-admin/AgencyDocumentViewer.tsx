import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Download, FileText, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { Button } from '../ui'
import { cn } from '../../../lib/cn'
import { formatDateTime } from '../../../lib/formatDateTime'
import type { AgencyDocument } from '../../../types/agency'

interface AgencyDocumentViewerProps {
  documents: AgencyDocument[]
  startIndex: number
  onClose: () => void
}

const MIN_SCALE = 1
const MAX_SCALE = 4

/**
 * Near-full-screen preview for a submitted verification document. Images
 * support zoom (buttons, wheel, double-click) and panning once zoomed in;
 * PDFs are handed to the browser's native viewer, which brings its own zoom
 * controls. Previous/Next lets the admin move through every document
 * submitted for this registration without closing and reopening the viewer.
 */
export function AgencyDocumentViewer({ documents, startIndex, onClose }: AgencyDocumentViewerProps) {
  const [index, setIndex] = useState(startIndex)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Reset zoom/pan whenever the viewed document changes, without a render-after-mount effect.
  const [lastIndex, setLastIndex] = useState(index)
  if (lastIndex !== index) {
    setLastIndex(index)
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const document = documents[index]

  function resetView() {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft' && documents.length > 1) {
        setIndex((prev) => (prev - 1 + documents.length) % documents.length)
      }
      if (event.key === 'ArrowRight' && documents.length > 1) {
        setIndex((prev) => (prev + 1) % documents.length)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    const previousOverflow = window.document.body.style.overflow
    window.document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.document.body.style.overflow = previousOverflow
    }
  }, [onClose, documents.length])

  function zoomBy(delta: number) {
    setScale((prev) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta))
      if (next === MIN_SCALE) setPosition({ x: 0, y: 0 })
      return next
    })
  }

  function handleWheel(event: React.WheelEvent) {
    if (document.fileType !== 'image') return
    event.preventDefault()
    zoomBy(event.deltaY < 0 ? 0.25 : -0.25)
  }

  function handleMouseDown(event: React.MouseEvent) {
    if (document.fileType !== 'image' || scale <= 1) return
    dragState.current = { startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y }
    setIsDragging(true)
  }

  function handleMouseMove(event: React.MouseEvent) {
    if (!dragState.current) return
    const dx = event.clientX - dragState.current.startX
    const dy = event.clientY - dragState.current.startY
    setPosition({ x: dragState.current.originX + dx, y: dragState.current.originY + dy })
  }

  function endDrag() {
    dragState.current = null
    setIsDragging(false)
  }

  const portalTarget = window.document.querySelector<HTMLElement>('[data-theme]') ?? window.document.body

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-inverse/90 p-3 motion-safe:animate-fade-in sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${document.label} preview`}
        className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-modal motion-safe:animate-pop-in"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="size-4 shrink-0 text-foreground-muted" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{document.label}</p>
              <p className="truncate text-xs text-foreground-muted">
                {document.fileName} · Uploaded {formatDateTime(document.uploadedAt)}
                {documents.length > 1 ? ` · Document ${index + 1} of ${documents.length}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close document preview"
            className="shrink-0 rounded-sm p-1.5 text-foreground-muted transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <X className="size-5" />
          </button>
        </div>

        <div
          className="relative flex-1 select-none overflow-hidden bg-surface-secondary"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
        >
          {documents.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous document"
                onClick={() => setIndex((prev) => (prev - 1 + documents.length) % documents.length)}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-surface/90 p-2 text-foreground shadow-panel transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Next document"
                onClick={() => setIndex((prev) => (prev + 1) % documents.length)}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-surface/90 p-2 text-foreground shadow-panel transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}

          {document.fileType === 'image' ? (
            <div className="flex h-full w-full items-center justify-center overflow-hidden">
              <img
                src={document.url}
                alt={document.label}
                draggable={false}
                onDoubleClick={() => (scale > 1 ? resetView() : zoomBy(1.5))}
                className={cn(
                  'max-h-full max-w-full object-contain motion-safe:transition-transform motion-safe:duration-150',
                  scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in',
                )}
                style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
              />
            </div>
          ) : (
            <iframe title={document.fileName} src={document.url} className="h-full w-full bg-white" />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
          {document.fileType === 'image' ? (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => zoomBy(-0.25)} disabled={scale <= MIN_SCALE} aria-label="Zoom out">
                <Minus className="size-3.5" />
              </Button>
              <span className="w-12 text-center text-xs text-foreground-muted">{Math.round(scale * 100)}%</span>
              <Button variant="outline" size="sm" onClick={() => zoomBy(0.25)} disabled={scale >= MAX_SCALE} aria-label="Zoom in">
                <Plus className="size-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={resetView} disabled={scale === 1 && position.x === 0 && position.y === 0}>
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            </div>
          ) : (
            <span className="text-xs text-foreground-muted">Use your browser's built-in PDF controls to zoom and scroll.</span>
          )}
          <a
            href={document.url}
            download={document.fileName}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface-secondary px-3 text-sm font-medium text-foreground transition-colors hover:bg-border"
          >
            <Download className="size-3.5" />
            Download
          </a>
        </div>
      </div>
    </div>,
    portalTarget,
  )
}
