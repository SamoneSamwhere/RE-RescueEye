import { useState } from 'react'

export const DEFAULT_PAGE_SIZES = [10, 25, 50]

export interface PaginationState {
  /** Zero-based, always within range even after the list shrinks. */
  page: number
  pageCount: number
  pageSize: number
  pageSizes: number[]
  total: number
  /** Index of the first item on this page. */
  start: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

/**
 * Client-side paging for a list that is already filtered and sorted. When the
 * number of items changes (a filter applied, a row removed), it goes back to
 * the first page so the reader never lands on an empty page past the end.
 */
export function usePagination<T>(items: T[], pageSizes: number[] = DEFAULT_PAGE_SIZES) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(pageSizes[0])
  const [lastTotal, setLastTotal] = useState(items.length)

  // Adjusting state during render (not in an effect) avoids a flash of the
  // old page; React re-renders immediately with the reset value.
  if (lastTotal !== items.length) {
    setLastTotal(items.length)
    setPage(0)
  }

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const start = currentPage * pageSize

  const pagination: PaginationState = {
    page: currentPage,
    pageCount,
    pageSize,
    pageSizes,
    total: items.length,
    start,
    onPageChange: setPage,
    onPageSizeChange: (size) => {
      setPageSize(size)
      setPage(0)
    },
  }

  return {
    pageItems: items.slice(start, start + pageSize),
    pagination,
    /** Back to the first page — for changes that reorder without changing the count, like a sort toggle. */
    resetPage: () => setPage(0),
  }
}
