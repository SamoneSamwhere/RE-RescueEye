import { UserRound } from 'lucide-react'
import { Field, Input } from '../../ui'
import type { PersonnelInfoValues } from './types'

interface PersonnelInfoStepProps {
  values: PersonnelInfoValues
  onChange: (patch: Partial<PersonnelInfoValues>) => void
}

export function PersonnelInfoStep({ values, onChange }: PersonnelInfoStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5 rounded-md border border-accent-border bg-accent-subtle px-3 py-2.5">
        <UserRound className="mt-0.5 size-4 shrink-0 text-accent" />
        <div>
          <p className="text-xs font-medium text-accent">Personnel information</p>
          <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">
            Tell us who you're adding to the agency. This information is used for their account and for contacting
            them during a response.
          </p>
        </div>
      </div>

      <Field label="Full Name" htmlFor="personnel-name">
        <Input
          id="personnel-name"
          autoComplete="name"
          value={values.fullName}
          onChange={(event) => onChange({ fullName: event.target.value })}
          placeholder="e.g. Jamie Ortiz"
          required
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Email" htmlFor="personnel-email" hint="Used to sign in to RescueEye.">
          <Input
            id="personnel-email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => onChange({ email: event.target.value })}
            placeholder="name@agency.org"
            required
          />
        </Field>

        <Field label="Contact Number" htmlFor="personnel-phone">
          <Input
            id="personnel-phone"
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(event) => onChange({ phone: event.target.value })}
            placeholder="+1-555-0100"
            required
          />
        </Field>
      </div>
    </div>
  )
}
