import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** Rendered inside the table's border, below the rows — e.g. a Pagination bar. */
  footer?: ReactNode
}

export function Table({ className, footer, ...props }: TableProps) {
  return (
    <div className="w-full overflow-hidden rounded-md border border-border">
      <div className="w-full overflow-x-auto">
        <table className={cn('w-full border-collapse text-sm', className)} {...props} />
      </div>
      {footer}
    </div>
  )
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-surface-secondary', className)} {...props} />
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-border', className)} {...props} />
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors hover:bg-surface-secondary', className)} {...props} />
}

export function TableHead({ className, scope = 'col', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope={scope}
      className={cn(
        'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-foreground-secondary',
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-3 py-2 text-foreground', className)} {...props} />
}
