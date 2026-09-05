import { Field, Input } from '../../ui'
import { AGENCY_TYPES } from './types'
import type { AgencyInfoValues } from './types'

const selectClasses =
  'h-9 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'

interface AgencyInfoStepProps {
  values: AgencyInfoValues
  onChange: (patch: Partial<AgencyInfoValues>) => void
}

export function AgencyInfoStep({ values, onChange }: AgencyInfoStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Agency Name" htmlFor="agency-name">
        <Input
          id="agency-name"
          value={values.agencyName}
          onChange={(event) => onChange({ agencyName: event.target.value })}
          placeholder="Metro Search & Rescue"
          required
        />
      </Field>

      <Field label="Agency Type" htmlFor="agency-type">
        <select
          id="agency-type"
          value={values.agencyType}
          onChange={(event) => onChange({ agencyType: event.target.value })}
          className={selectClasses}
        >
          <option value="" disabled>
            Select a type
          </option>
          {AGENCY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Agency Address" htmlFor="agency-address">
        <Input
          id="agency-address"
          value={values.agencyAddress}
          onChange={(event) => onChange({ agencyAddress: event.target.value })}
          placeholder="Street, city, state/province, postal code"
          required
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Contact Number" htmlFor="agency-phone">
          <Input
            id="agency-phone"
            type="tel"
            value={values.agencyPhone}
            onChange={(event) => onChange({ agencyPhone: event.target.value })}
            required
          />
        </Field>

        <Field label="Official Email" htmlFor="agency-email">
          <Input
            id="agency-email"
            type="email"
            value={values.agencyEmail}
            onChange={(event) => onChange({ agencyEmail: event.target.value })}
            placeholder="ops@youragency.org"
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
