import type { MediaAsset } from '../types/media'
import type { Drone } from '../types/drone'

export function sourceLabelFor(mediaAssetId: string, mediaAssets: MediaAsset[], drones: Drone[]): string {
  const media = mediaAssets.find((asset) => asset.id === mediaAssetId)
  if (!media) return 'Unknown source'

  const drone = media.droneId ? drones.find((d) => d.id === media.droneId) : undefined
  if (media.sourceType === 'LIVE_FEED') {
    return drone ? `Live Feed — ${drone.name}` : 'Live Feed'
  }
  return drone ? `Uploaded — ${drone.name}` : 'Uploaded Video'
}
