import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '../../../lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid}
        className={cn(
          'h-9 w-full rounded-md border bg-surface-secondary px-2 text-sm text-foreground placeholder:text-foreground-muted transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          invalid
            ? 'border-danger-border focus-visible:ring-danger'
            : 'border-border-strong focus-visible:ring-focus',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'
