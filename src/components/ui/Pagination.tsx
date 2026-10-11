import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { PaginationState } from '../../hooks/usePagination'

interface PaginationProps extends PaginationState {
  className?: string
}

/** Page numbers to show: always the first and last, the current page and its neighbours, and gaps between. */
function pageWindow(page: number, pageCount: number): Array<number | 'gap'> {
  const pages = new Set([0, pageCount - 1, page - 1, page, page + 1].filter((p) => p >= 0 && p < pageCount))
  const sorted = [...pages].sort((a, b) => a - b)
  const result: Array<number | 'gap'> = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('gap')
    result.push(p)
  })
  return result
}

const navButton =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-40'

/**
 * Footer for a paged table: which rows are showing, how many per page, and
 * page navigation. Pair with usePagination and spread its `pagination` in.
 */
export function Pagination({
  page,
  pageCount,
  pageSize,
  pageSizes,
  total,
  start,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  if (total === 0) return null

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2 text-xs text-foreground-secondary',
        className,
      )}
    >
      <span className="tabular-nums">
        Showing <span className="font-semibold text-foreground">{start + 1}–{Math.min(start + pageSize, total)}</span> of{' '}
        <span className="font-semibold text-foreground">{total}</span>
      </span>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5">
          Rows
          <select
            className="h-8 rounded-md border border-border-strong bg-surface px-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cn(navButton, 'border-border bg-surface text-foreground hover:bg-surface-secondary')}
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          {pageWindow(page, pageCount).map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 text-foreground-muted" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p + 1}`}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  navButton,
                  p === page
                    ? 'border-accent bg-accent text-foreground-inverse'
                    : 'border-border bg-surface text-foreground hover:bg-surface-secondary',
                )}
              >
                {p + 1}
              </button>
            ),
          )}
          <button
            type="button"
            className={cn(navButton, 'border-border bg-surface text-foreground hover:bg-surface-secondary')}
            disabled={page >= pageCount - 1}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </nav>
  )
}
