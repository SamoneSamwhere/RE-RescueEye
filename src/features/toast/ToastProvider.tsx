import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '../../lib/cn'

export type ToastTone = 'success' | 'info' | 'warning' | 'danger'

export interface ToastOptions {
  tone?: ToastTone
  title?: string
  message: string
  /** Milliseconds before it dismisses itself; hovering pauses the countdown. */
  duration?: number
}

interface ToastRecord extends Required<Omit<ToastOptions, 'title'>> {
  id: number
  title?: string
}

interface ToastApi {
  show: (options: ToastOptions) => void
  success: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
}

const ToastContext = createContext<ToastApi | undefined>(undefined)

/** Older toasts beyond this are dropped so a burst of actions never buries the screen. */
const MAX_VISIBLE = 4
const DEFAULT_DURATION = 5000

const TONE_ICON = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  danger: XCircle,
} as const

const TONE_CLASSES: Record<ToastTone, { icon: string; bar: string }> = {
  success: { icon: 'bg-success-bg text-success-fg', bar: 'bg-success' },
  info: { icon: 'bg-info-bg text-info-fg', bar: 'bg-info' },
  warning: { icon: 'bg-warning-bg text-warning-fg', bar: 'bg-warning' },
  danger: { icon: 'bg-danger-bg text-danger-fg', bar: 'bg-danger' },
}

/**
 * Transient confirmations ("Responders alerted", "Agency approved") that pop
 * in at the top of the screen, stack newest-first, and dismiss themselves.
 * For outcomes of an action the user just took — persistent state still
 * belongs on the page.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((options: ToastOptions) => {
    const toast: ToastRecord = {
      id: nextId.current++,
      tone: options.tone ?? 'info',
      title: options.title,
      message: options.message,
      duration: options.duration ?? DEFAULT_DURATION,
    }
    setToasts((current) => [toast, ...current].slice(0, MAX_VISIBLE))
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, title) => show({ tone: 'success', message, title }),
      info: (message, title) => show({ tone: 'info', message, title }),
      warning: (message, title) => show({ tone: 'warning', message, title }),
      error: (message, title) => show({ tone: 'danger', message, title, duration: 8000 }),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Below the mobile top bar on small screens; top-right corner from md up. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-16 z-[70] flex flex-col items-center gap-2 md:inset-x-auto md:right-4 md:top-4 md:items-end"
      >
        <MotionConfig reducedMotion="user">
          <AnimatePresence initial={false}>
            {toasts.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
            ))}
          </AnimatePresence>
        </MotionConfig>
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(toast.duration)

  // Count down only while not hovered; resuming continues from where it stopped.
  useEffect(() => {
    if (paused) return
    const startedAt = Date.now()
    const timer = window.setTimeout(onDismiss, remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current -= Date.now() - startedAt
    }
  }, [paused, onDismiss])

  const Icon = TONE_ICON[toast.tone]
  const tone = TONE_CLASSES[toast.tone]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 48, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      role={toast.tone === 'danger' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
    >
      <div className="flex items-start gap-3 px-3 py-3">
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', tone.icon)}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          {toast.title ? <p className="text-sm font-semibold text-foreground">{toast.title}</p> : null}
          <p className={cn('break-words text-sm', toast.title ? 'text-foreground-secondary' : 'text-foreground')}>
            {toast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="shrink-0 rounded p-1 text-foreground-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      {/* Time left before it closes; freezes while hovered. */}
      <div
        className={cn('absolute bottom-0 left-0 h-0.5 origin-left motion-reduce:hidden', tone.bar)}
        style={{
          width: '100%',
          animation: `toast-countdown ${toast.duration}ms linear forwards`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      />
    </motion.div>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
