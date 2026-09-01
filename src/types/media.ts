/** A media asset is either a live drone feed session or an uploaded recorded video — never assume one or the other. */
export type MediaSourceType = 'LIVE_FEED' | 'UPLOADED_VIDEO'

export interface MediaAsset {
  id: string
  agencyId: string
  sourceType: MediaSourceType
  /** Present for LIVE_FEED and any recording captured by a registered drone; absent for a plain uploaded video. */
  droneId?: string
  url: string
  capturedAt: string
  uploadedByUserId?: string
}

/* ── Stored media (real, served by the Python API) ────────────────────────────
 * MediaAsset above is the mock-store shape used by the rest of the Command
 * Staff screens. The types below mirror what /media actually returns, using
 * the API's snake_case verbatim so there is no silent drift between the two.
 */

/** A still captured out of a stored clip and kept for later review. */
export interface StoredFrame {
  id: string
  media_id: string
  t_sec: number
  file: string
  captured_at: string
  note: string
}

/** A recorded clip held in the API's media library. */
export interface StoredMedia {
  id: string
  original_name: string
  file: string
  size_bytes: number
  content_type: string
  source_type: MediaSourceType
  captured_at: string
  uploaded_at: string
  agency_id: string | null
  drone_id: string | null
  uploaded_by: string | null
  uploaded_by_name: string | null
  duration_sec: number | null
  width: number | null
  height: number | null
  note: string
  frames: StoredFrame[]
  frame_count: number
}

export interface MediaLibraryStats {
  count: number
  frame_count: number
  bytes: number
  dir: string
}
