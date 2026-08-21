/**
 * Mock "current time" for the whole app. The seed data in src/data/ is
 * written as if today is 2026-08-20, afternoon (UTC) — using the real
 * system clock for freshly created records would make them sort before
 * (or unpredictably relative to) that seed data whenever the real clock
 * doesn't happen to match, which breaks anything that sorts by timestamp
 * (timelines, "recent" lists). Every mutation that stamps a new record
 * should call now() here instead of `new Date()`.
 *
 * Anchored just after the latest seed timestamp, then advances in real
 * time from module load so a sequence of actions within one session still
 * orders correctly relative to itself.
 */
const MOCK_NOW_ANCHOR_MS = new Date('2026-08-20T14:20:00Z').getTime()
const LOAD_TIME_MS = Date.now()

export function now(): Date {
  return new Date(MOCK_NOW_ANCHOR_MS + (Date.now() - LOAD_TIME_MS))
}
