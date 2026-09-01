import React, {
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode, RefObject, CSSProperties } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import type { Transition, Variant } from 'motion/react'
import { createPortal } from 'react-dom'
import { XIcon } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useClickOutside } from '../../../hooks/useClickOutside'

export interface MorphingDialogContextType {
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  uniqueId: string
  triggerRef: RefObject<HTMLButtonElement | null>
}

const MorphingDialogContext = React.createContext<MorphingDialogContextType | null>(null)

function useMorphingDialog() {
  const context = useContext(MorphingDialogContext)
  if (!context) {
    throw new Error('MorphingDialog components must be used within a <MorphingDialog>')
  }
  return context
}

export interface MorphingDialogProps {
  children: ReactNode
  transition?: Transition
}

/** A dialog whose trigger visually morphs into the open dialog via a shared layout animation. */
export function MorphingDialog({ children, transition }: MorphingDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const uniqueId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)

  const contextValue = useMemo(
    () => ({ isOpen, setIsOpen, uniqueId, triggerRef }),
    [isOpen, uniqueId],
  )

  return (
    <MorphingDialogContext.Provider value={contextValue}>
      <MotionConfig transition={transition}>{children}</MotionConfig>
    </MorphingDialogContext.Provider>
  )
}

export interface MorphingDialogTriggerProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function MorphingDialogTrigger({ children, className, style }: MorphingDialogTriggerProps) {
  const { setIsOpen, isOpen, uniqueId, triggerRef } = useMorphingDialog()

  const handleClick = useCallback(() => setIsOpen(!isOpen), [isOpen, setIsOpen])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setIsOpen(!isOpen)
      }
    },
    [isOpen, setIsOpen],
  )

  return (
    <motion.button
      ref={triggerRef}
      layoutId={`morphing-dialog-${uniqueId}`}
      className={cn('relative cursor-pointer text-left', className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={style}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls={`morphing-dialog-content-${uniqueId}`}
    >
      {children}
    </motion.button>
  )
}

export interface MorphingDialogContentProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function MorphingDialogContent({ children, className, style }: MorphingDialogContentProps) {
  const { setIsOpen, isOpen, uniqueId, triggerRef } = useMorphingDialog()
  const containerRef = useRef<HTMLDivElement>(null)
  const [firstFocusableElement, setFirstFocusableElement] = useState<HTMLElement | null>(null)
  const [lastFocusableElement, setLastFocusableElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
      if (event.key === 'Tab') {
        if (!firstFocusableElement || !lastFocusableElement) return
        if (event.shiftKey) {
          if (document.activeElement === firstFocusableElement) {
            event.preventDefault()
            lastFocusableElement.focus()
          }
        } else if (document.activeElement === lastFocusableElement) {
          event.preventDefault()
          firstFocusableElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [setIsOpen, firstFocusableElement, lastFocusableElement])

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden')
      const focusableElements = containerRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusableElements && focusableElements.length > 0) {
        setFirstFocusableElement(focusableElements[0])
        setLastFocusableElement(focusableElements[focusableElements.length - 1])
        focusableElements[0].focus()
      }
    } else {
      document.body.classList.remove('overflow-hidden')
      triggerRef.current?.focus()
    }
  }, [isOpen, triggerRef])

  useClickOutside(containerRef, () => {
    if (isOpen) setIsOpen(false)
  })

  return (
    <motion.div
      ref={containerRef}
      layoutId={`morphing-dialog-${uniqueId}`}
      className={cn('overflow-hidden', className)}
      style={style}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`morphing-dialog-title-${uniqueId}`}
      aria-describedby={`morphing-dialog-description-${uniqueId}`}
      id={`morphing-dialog-content-${uniqueId}`}
    >
      {children}
    </motion.div>
  )
}

export interface MorphingDialogContainerProps {
  children: ReactNode
}

export function MorphingDialogContainer({ children }: MorphingDialogContainerProps) {
  const { isOpen, uniqueId } = useMorphingDialog()
  const [mounted, setMounted] = useState(false)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setMounted(true)
    setPortalTarget(document.querySelector<HTMLElement>('[data-theme]') ?? document.body)
    return () => setMounted(false)
  }, [])

  if (!mounted || !portalTarget) return null

  return createPortal(
    <AnimatePresence initial={false} mode="sync">
      {isOpen ? (
        <React.Fragment key={`morphing-dialog-portal-${uniqueId}`}>
          <motion.div
            key={`morphing-dialog-backdrop-${uniqueId}`}
            className="fixed inset-0 z-50 h-full w-full bg-surface-inverse/50 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">{children}</div>
        </React.Fragment>
      ) : null}
    </AnimatePresence>,
    portalTarget,
  )
}

export interface MorphingDialogTitleProps {
  children: ReactNode
  className?: string
}

export function MorphingDialogTitle({ children, className }: MorphingDialogTitleProps) {
  const { uniqueId } = useMorphingDialog()
  return (
    <motion.div
      layoutId={`morphing-dialog-title-${uniqueId}`}
      id={`morphing-dialog-title-${uniqueId}`}
      className={className}
      layout
    >
      {children}
    </motion.div>
  )
}

export interface MorphingDialogSubtitleProps {
  children: ReactNode
  className?: string
}

export function MorphingDialogSubtitle({ children, className }: MorphingDialogSubtitleProps) {
  const { uniqueId } = useMorphingDialog()
  return (
    <motion.div layoutId={`morphing-dialog-subtitle-${uniqueId}`} className={className}>
      {children}
    </motion.div>
  )
}

export interface MorphingDialogDescriptionProps {
  children: ReactNode
  className?: string
  disableLayoutAnimation?: boolean
  variants?: {
    initial: Variant
    animate: Variant
    exit: Variant
  }
}

export function MorphingDialogDescription({
  children,
  className,
  variants,
  disableLayoutAnimation,
}: MorphingDialogDescriptionProps) {
  const { uniqueId } = useMorphingDialog()
  return (
    <motion.div
      key={`morphing-dialog-description-${uniqueId}`}
      layoutId={disableLayoutAnimation ? undefined : `morphing-dialog-description-${uniqueId}`}
      variants={variants}
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
      id={`morphing-dialog-description-${uniqueId}`}
    >
      {children}
    </motion.div>
  )
}

export interface MorphingDialogCloseProps {
  children?: ReactNode
  className?: string
  variants?: {
    initial: Variant
    animate: Variant
    exit: Variant
  }
}

export function MorphingDialogClose({ children, className, variants }: MorphingDialogCloseProps) {
  const { setIsOpen, uniqueId } = useMorphingDialog()
  const handleClose = useCallback(() => setIsOpen(false), [setIsOpen])

  return (
    <motion.button
      onClick={handleClose}
      type="button"
      aria-label="Close dialog"
      key={`morphing-dialog-close-${uniqueId}`}
      className={cn('absolute right-4 top-4', className)}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
    >
      {children || <XIcon size={20} />}
    </motion.button>
  )
}
