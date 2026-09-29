import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../data/components/layout'
import { Reveal } from '../data/components/landing/Reveal'
import { Panel } from '../data/components/ui'
import {
  GeoMapCanvas,
  MapLegend,
  MarkerDetailPanel,
  MarkerFilterBar,
  EMPTY_MARKER_FILTERS,
  applyMarkerFilters,
  countIncidentMarkers,
} from '../data/components/map'
import type { MarkerFilters } from '../data/components/map'
import { useDamageMapMarkers } from '../features/command-staff'

export function CommandStaffMapPage() {
  const markers = useDamageMapMarkers()
  // The dashboard preview links here as ?marker=<id>, so a marker clicked
  // there opens already selected, detail panel and all.
  const [searchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('marker'))
  const [filters, setFilters] = useState<MarkerFilters>(EMPTY_MARKER_FILTERS)

  const visibleMarkers = useMemo(() => applyMarkerFilters(markers, filters), [markers, filters])

  // Looked up in the *visible* set, so filtering a marker off the map also
  // clears its detail panel rather than leaving a card for a dot that is no
  // longer there.
  const selectedMarker = visibleMarkers.find((m) => m.id === selectedId) ?? null

  return (
    <>
      <PageHeader
        title="Damage Map"
        description="Verified casualties, confirmed incidents, and Field Responder positions across the Cebu City survey area."
      />

      <Reveal className="grid grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel title={`Damage Map (${visibleMarkers.length} markers)`}>
          <div className="flex flex-col gap-3">
            <MarkerFilterBar
              filters={filters}
              onChange={setFilters}
              shown={countIncidentMarkers(visibleMarkers)}
              total={countIncidentMarkers(markers)}
            />
            <GeoMapCanvas
              // Clustered here as on the phone: a whole survey area on screen
              // stacks the markers of one site into a pile nobody can click.
              cluster
              markers={visibleMarkers}
              selectedId={selectedId}
              onSelect={(marker) => setSelectedId(marker.id)}
            />
            <MapLegend />
          </div>
        </Panel>
        <MarkerDetailPanel marker={selectedMarker} />
      </Reveal>
    </>
  )
}
