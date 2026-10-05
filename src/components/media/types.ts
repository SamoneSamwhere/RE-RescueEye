import type { MediaSourceType } from '../../types/media'

/** MediaAsset enriched with display-ready fields, derived by the drone & media page. */
export interface MediaHistoryItem {
  id: string
  sourceType: MediaSourceType
  droneName?: string
  uploadedByName?: string
  capturedAt: string
}
