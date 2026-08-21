import type { Detection } from '../../types/detection'

/** Detection enriched with a display-ready media source label. */
export interface EnrichedDetection extends Detection {
  sourceLabel: string
}
