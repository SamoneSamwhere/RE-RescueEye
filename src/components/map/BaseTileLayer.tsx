import { TileLayer } from 'react-leaflet'

/** OpenStreetMap raster tiles — no API key, no billing, attribution required. */
export function BaseTileLayer() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />
  )
}
