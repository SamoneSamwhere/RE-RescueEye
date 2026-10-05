import { Loader2, TriangleAlert } from 'lucide-react'
import { Field } from '../ui'
import { usePsgcList } from '../../hooks/usePsgcList'
import {
  fetchRegions,
  fetchProvinces,
  fetchCitiesByRegion,
  fetchCitiesByProvince,
  fetchBarangays,
} from '../../lib/psgc'
import { cn } from '../../lib/cn'

export interface PhilippineAddressValue {
  regionCode: string
  regionName: string
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
  barangayCode: string
  barangayName: string
}

export const EMPTY_PHILIPPINE_ADDRESS: PhilippineAddressValue = {
  regionCode: '',
  regionName: '',
  provinceCode: '',
  provinceName: '',
  cityCode: '',
  cityName: '',
  barangayCode: '',
  barangayName: '',
}

interface PhilippineAddressFieldsProps {
  value: PhilippineAddressValue
  onChange: (value: PhilippineAddressValue) => void
  className?: string
}

const selectClasses =
  'h-9 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-60'

/**
 * Region -> Province -> City/Municipality -> Barangay cascading picker backed
 * by the official PSGC (see lib/psgc.ts). Fully controlled: this component
 * holds no address state of its own, only the fetched option lists for
 * whatever parent is currently selected. Selecting a level always clears
 * every level below it in the emitted value, and PSGC codes — not the
 * display names — are what should be persisted, since names can be
 * relabeled by PSA without the place changing.
 *
 * Reusable anywhere a Philippine address is collected — registration,
 * profile, agency, or any other address form — by giving it a value/onChange
 * pair, same as a controlled input.
 */
export function PhilippineAddressFields({ value, onChange, className }: PhilippineAddressFieldsProps) {
  const regions = usePsgcList('regions', fetchRegions)

  const provinces = usePsgcList(value.regionCode ? `provinces:${value.regionCode}` : null, () =>
    fetchProvinces(value.regionCode),
  )

  // Provinces load before cities can be decided: NCR (and any other region
  // with no province level) skips straight to region-scoped cities once the
  // provinces call comes back empty, rather than leaving the user stuck on a
  // province dropdown that will never have anything to pick.
  const hasProvinceLevel = provinces.status !== 'ready' || provinces.items.length > 0

  const cityKey = hasProvinceLevel
    ? value.provinceCode
      ? `cities:province:${value.provinceCode}`
      : null
    : value.regionCode
      ? `cities:region:${value.regionCode}`
      : null
  const cities = usePsgcList(cityKey, () =>
    hasProvinceLevel ? fetchCitiesByProvince(value.provinceCode) : fetchCitiesByRegion(value.regionCode),
  )

  const barangays = usePsgcList(value.cityCode ? `barangays:${value.cityCode}` : null, () =>
    fetchBarangays(value.cityCode),
  )

  function handleRegionChange(code: string) {
    const region = regions.items.find((r) => r.code === code)
    onChange({
      ...EMPTY_PHILIPPINE_ADDRESS,
      regionCode: code,
      regionName: region?.name ?? '',
    })
  }

  function handleProvinceChange(code: string) {
    const province = provinces.items.find((p) => p.code === code)
    onChange({
      ...value,
      provinceCode: code,
      provinceName: province?.name ?? '',
      cityCode: '',
      cityName: '',
      barangayCode: '',
      barangayName: '',
    })
  }

  function handleCityChange(code: string) {
    const city = cities.items.find((c) => c.code === code)
    onChange({
      ...value,
      cityCode: code,
      cityName: city?.name ?? '',
      barangayCode: '',
      barangayName: '',
    })
  }

  function handleBarangayChange(code: string) {
    const barangay = barangays.items.find((b) => b.code === code)
    onChange({ ...value, barangayCode: code, barangayName: barangay?.name ?? '' })
  }

  return (
    <div className={cn('grid grid-cols-1 gap-3 @sm:grid-cols-2', className)}>
      <Field label="Region" htmlFor="address-region" error={regions.status === 'error' ? regions.error : undefined}>
        <LevelSelect
          id="address-region"
          value={value.regionCode}
          onChange={handleRegionChange}
          state={regions}
          placeholder="Select a region"
          onRetry={regions.retry}
        />
      </Field>

      <Field
        label="Province"
        htmlFor="address-province"
        error={provinces.status === 'error' ? provinces.error : undefined}
        hint={
          !regions.error && value.regionCode && !hasProvinceLevel
            ? 'This region has no provinces — pick the city/municipality directly.'
            : undefined
        }
      >
        {value.regionCode && !hasProvinceLevel ? (
          <p className="flex h-9 items-center px-2 text-sm text-foreground-muted">Not applicable</p>
        ) : (
          <LevelSelect
            id="address-province"
            value={value.provinceCode}
            onChange={handleProvinceChange}
            state={provinces}
            placeholder="Select a province"
            disabled={!value.regionCode}
            onRetry={provinces.retry}
          />
        )}
      </Field>

      <Field label="City / Municipality" htmlFor="address-city" error={cities.status === 'error' ? cities.error : undefined}>
        <LevelSelect
          id="address-city"
          value={value.cityCode}
          onChange={handleCityChange}
          state={cities}
          placeholder="Select a city or municipality"
          disabled={hasProvinceLevel ? !value.provinceCode : !value.regionCode}
          onRetry={cities.retry}
        />
      </Field>

      <Field label="Barangay" htmlFor="address-barangay" error={barangays.status === 'error' ? barangays.error : undefined}>
        <LevelSelect
          id="address-barangay"
          value={value.barangayCode}
          onChange={handleBarangayChange}
          state={barangays}
          placeholder="Select a barangay"
          disabled={!value.cityCode}
          onRetry={barangays.retry}
        />
      </Field>
    </div>
  )
}

interface LevelOption {
  code: string
  name: string
}

interface LevelSelectProps {
  id: string
  value: string
  onChange: (code: string) => void
  state: { status: 'idle' | 'loading' | 'error' | 'ready'; items: LevelOption[]; error: string | null }
  placeholder: string
  disabled?: boolean
  onRetry: () => void
}

function LevelSelect({ id, value, onChange, state, placeholder, disabled, onRetry }: LevelSelectProps) {
  if (state.status === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="flex h-9 w-full items-center gap-1.5 rounded-md border border-danger-border bg-danger-bg px-2 text-sm text-danger-fg transition-colors hover:bg-danger-bg/80"
      >
        <TriangleAlert className="size-3.5 shrink-0" />
        Couldn't load — tap to retry
      </button>
    )
  }

  const isLoading = state.status === 'loading'

  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || isLoading || state.items.length === 0}
        className={selectClasses}
      >
        <option value="" disabled>
          {isLoading ? 'Loading…' : placeholder}
        </option>
        {state.items.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </select>
      {isLoading ? (
        <Loader2 className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-foreground-muted" />
      ) : null}
    </div>
  )
}
