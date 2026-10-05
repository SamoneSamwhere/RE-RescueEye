import { Field, Input } from '../../ui'
import { PhilippineAddressFields } from '../../address'
import type { AgencyInfoValues } from './types'

interface AddressStepProps {
  values: AgencyInfoValues
  onChange: (patch: Partial<AgencyInfoValues>) => void
}

/**
 * Step 2 — the office address, split out from Organization Details so that
 * step isn't overloaded. Region/Province/City/Barangay come from the official
 * PSGC via cascading dropdowns; street and ZIP stay free text since PSGC has
 * no data at that level.
 */
export function AddressStep({ values, onChange }: AddressStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <PhilippineAddressFields
        value={{
          regionCode: values.addressRegionCode,
          regionName: values.addressRegionName,
          provinceCode: values.addressProvinceCode,
          provinceName: values.addressProvince,
          cityCode: values.addressCityCode,
          cityName: values.addressCity,
          barangayCode: values.addressBarangayCode,
          barangayName: values.addressBarangay,
        }}
        onChange={(next) =>
          onChange({
            addressRegionCode: next.regionCode,
            addressRegionName: next.regionName,
            addressProvinceCode: next.provinceCode,
            addressProvince: next.provinceName,
            addressCityCode: next.cityCode,
            addressCity: next.cityName,
            addressBarangayCode: next.barangayCode,
            addressBarangay: next.barangayName,
          })
        }
      />

      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-[minmax(0,1fr)_10rem]">
        <Field label="House / Building No. and Street" htmlFor="address-street" hint="Optional.">
          <Input
            id="address-street"
            autoComplete="address-line1"
            value={values.addressStreet}
            onChange={(event) => onChange({ addressStreet: event.target.value })}
            placeholder="2F City Hall Annex, Osmeña Blvd."
          />
        </Field>

        <Field label="ZIP Code" htmlFor="address-zip">
          <Input
            id="address-zip"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={4}
            value={values.addressZip}
            onChange={(event) => onChange({ addressZip: event.target.value.replace(/\D/g, '') })}
            placeholder="6000"
            required
          />
        </Field>
      </div>
    </div>
  )
}
