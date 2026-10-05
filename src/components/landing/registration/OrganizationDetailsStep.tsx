import { Field, Input } from '../../ui'
import { formatPhPhone } from '../../../../lib/phone'
import { ORGANIZATION_TYPES } from './types'
import type { AgencyInfoValues } from './types'

const selectClasses =
  'h-9 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'

interface OrganizationDetailsStepProps {
  values: AgencyInfoValues
  onChange: (patch: Partial<AgencyInfoValues>) => void
}

/**
 * Step 1 — who the organization is and how to reach it. Address lives on its
 * own step (see AddressStep) so this one doesn't overwhelm the small card
 * with ten fields at once.
 */
export function OrganizationDetailsStep({ values, onChange }: OrganizationDetailsStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
        <Field label="Organization Name" htmlFor="agency-name">
          <Input
            id="agency-name"
            value={values.agencyName}
            onChange={(event) => onChange({ agencyName: event.target.value })}
            placeholder="Cebu City Rescue Volunteers"
            required
          />
        </Field>

        <Field label="Organization Type" htmlFor="agency-type">
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
      </div>

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
