export interface MonthBucket {
  /** `YYYY-MM`, comparable against the first 7 characters of an ISO timestamp. */
  key: string
  /** Short month name; January also carries the year so the axis reads across a year change. */
  label: string
}

/** The last `count` calendar months, oldest first, ending with the current month (UTC). */
export function lastMonths(count: number, now: Date = new Date()): MonthBucket[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1))
    const month = date.toLocaleString('en', { month: 'short', timeZone: 'UTC' })
    return {
      key: date.toISOString().slice(0, 7),
      label: date.getUTCMonth() === 0 ? `${month} '${String(date.getUTCFullYear()).slice(2)}` : month,
    }
  })
}
