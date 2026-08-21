/**
 * Generates a unique id for a freshly created mock record. `crypto.randomUUID`
 * guarantees uniqueness within a session — plain `Date.now()` has only
 * millisecond resolution, so two records created in quick succession (e.g.
 * two notifications from one action) could otherwise collide and corrupt
 * state, since every store matches records by id.
 */
export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}
