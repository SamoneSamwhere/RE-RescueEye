import { Field, Input } from '../../ui'
import { formatPhPhone } from '../../../../lib/phone'
import { ORGANIZATION_TYPES, PH_PROVINCES } from './types'
import type { AgencyInfoValues } from './types'

const selectClasses =
  'h-9 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'

interface AgencyInfoStepProps {
  values: AgencyInfoValues
  onChange: (patch: Partial<AgencyInfoValues>) => void
}

/**
 * Step 1 — the organization. "Organization" rather than "agency" throughout:
 * volunteer rescue groups and NGOs register here too, and none of them is an
 * agency.
 */
export function AgencyInfoStep({ values, onChange }: AgencyInfoStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Organization Name" htmlFor="agency-name">
        <Input
          id="agency-name"
          value={values.agencyName}
          onChange={(event) => onChange({ agencyName: event.target.value })}
          placeholder="Cebu City Rescue Volunteers"
          required
        />
      </Field>

      <Field
        label="Organization Type"
        htmlFor="agency-type"
        hint="Decides which documents you will be asked for."
      >
        <select
          id="agency-type"
          value={values.agencyType}
          onChange={(event) => onChange({ agencyType: event.target.value })}
          className={selectClasses}
        >
          <option value="" disabled>
            Select a type
          </option>
          {ORGANIZATION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.value}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground-secondary">
          Office Address
        </legend>
        <Field label="House / Building No. and Street" htmlFor="address-street" hint="Optional.">
          <Input
            id="address-street"
            autoComplete="address-line1"
            value={values.addressStreet}
            onChange={(event) => onChange({ addressStreet: event.target.value })}
            placeholder="2F City Hall Annex, Osmeña Blvd."
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
          <Field label="Barangay" htmlFor="address-barangay">
            <Input
              id="address-barangay"
              value={values.addressBarangay}
              onChange={(event) => onChange({ addressBarangay: event.target.value })}
              placeholder="Kamputhaw"
              required
            />
          </Field>
          <Field label="City / Municipality" htmlFor="address-city">
            <Input
              id="address-city"
              autoComplete="address-level2"
              value={values.addressCity}
              onChange={(event) => onChange({ addressCity: event.target.value })}
              placeholder="Cebu City"
              required
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 @sm:grid-cols-[minmax(0,1fr)_8rem]">
          <Field label="Province" htmlFor="address-province">
            <select
              id="address-province"
              value={values.addressProvince}
              onChange={(event) => onChange({ addressProvince: event.target.value })}
              className={selectClasses}
            >
              <option value="" disabled>
                Select a province
              </option>
              {PH_PROVINCES.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
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
      </fieldset>

      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
        <Field label="Contact Number" htmlFor="agency-phone" hint="PH mobile or landline.">
          <Input
            id="agency-phone"
            type="tel"
            value={values.agencyPhone}
            onChange={(event) => onChange({ agencyPhone: event.target.value })}
            onBlur={() => onChange({ agencyPhone: formatPhPhone(values.agencyPhone) })}
            placeholder="0917 123 4567 or (032) 234 5678"
            required
          />
        </Field>

        <Field label="Official Email" htmlFor="agency-email">
          <Input
            id="agency-email"
            type="email"
            value={values.agencyEmail}
            onChange={(event) => onChange({ agencyEmail: event.target.value })}
            placeholder="ops@yourorganization.org"
            required
          />
        </Field>
      </div>

      <Field label="Website" htmlFor="agency-website" hint="Optional.">
        <Input
          id="agency-website"
          type="url"
          value={values.agencyWebsite}
          onChange={(event) => onChange({ agencyWebsite: event.target.value })}
          placeholder="https://"
        />
      </Field>
    </div>
  )
}
