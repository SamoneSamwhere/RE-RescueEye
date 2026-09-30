/**
 * Client for the PSGC Cloud API (https://psgc.gitlab.io/api/), a free REST
 * mirror of the PSA's official Philippine Standard Geographic Code (PSGC)
 * publication. Codes (not names) are the source of truth throughout this
 * app's address data — names are for display only and can be relabeled by
 * PSA without changing what a stored address actually points to.
 *
 * Every level is fetched lazily and scoped to its parent (provinces of one
 * region, cities of one province, barangays of one city) rather than
 * bundling the ~42,000-barangay dataset into the app.
 */

const BASE_URL = 'https://psgc.gitlab.io/api'

export interface PsgcRegion {
  code: string
  name: string
  regionName: string
}

export interface PsgcProvince {
  code: string
  name: string
  regionCode: string
}

export interface PsgcCityMunicipality {
  code: string
  name: string
  isCity: boolean
  isMunicipality: boolean
  provinceCode: string | false
  regionCode: string
}

export interface PsgcBarangay {
  code: string
  name: string
  cityCode: string | false
  municipalityCode: string | false
}

/**
 * One in-flight/completed request per path for the lifetime of the tab —
 * PSGC codes and names do not change during a session, and every consumer
 * of, say, Cebu's cities should share one fetch instead of issuing their own.
 * A failed request is evicted so the next caller can retry it.
 */
const requestCache = new Map<string, Promise<unknown>>()

async function getJson<T>(path: string): Promise<T> {
  let pending = requestCache.get(path) as Promise<T> | undefined
  if (!pending) {
    pending = fetch(`${BASE_URL}${path}`).then((res) => {
      if (!res.ok) throw new Error(`Could not load location data (HTTP ${res.status}).`)
      return res.json() as Promise<T>
    })
    pending.catch(() => requestCache.delete(path))
    requestCache.set(path, pending)
  }
  return pending
}

export function fetchRegions(): Promise<PsgcRegion[]> {
  return getJson<PsgcRegion[]>('/regions/')
}

export function fetchProvinces(regionCode: string): Promise<PsgcProvince[]> {
  return getJson<PsgcProvince[]>(`/regions/${regionCode}/provinces/`)
}

/** NCR (and any other region with no provinces) lists its cities directly under the region. */
export function fetchCitiesByRegion(regionCode: string): Promise<PsgcCityMunicipality[]> {
  return getJson<PsgcCityMunicipality[]>(`/regions/${regionCode}/cities-municipalities/`)
}

export function fetchCitiesByProvince(provinceCode: string): Promise<PsgcCityMunicipality[]> {
  return getJson<PsgcCityMunicipality[]>(`/provinces/${provinceCode}/cities-municipalities/`)
}

export function fetchBarangays(cityOrMunicipalityCode: string): Promise<PsgcBarangay[]> {
  return getJson<PsgcBarangay[]>(`/cities-municipalities/${cityOrMunicipalityCode}/barangays/`)
}

export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}
