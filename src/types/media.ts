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
