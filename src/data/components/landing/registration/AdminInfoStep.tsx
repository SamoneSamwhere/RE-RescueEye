import { Field, Input } from '../../ui'
import { formatPhPhone } from '../../../../lib/phone'
import { OTHER_POSITION, SAR_POSITIONS } from './types'
import type { AdminInfoValues } from './types'

const selectClasses =
  'h-9 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'

interface AdminInfoStepProps {
  values: AdminInfoValues
  onChange: (patch: Partial<AdminInfoValues>) => void
}

export function AdminInfoStep({ values, onChange }: AdminInfoStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-accent-border bg-accent-subtle px-3 py-2.5">
        <p className="text-xs font-medium text-accent">Organization administrator account</p>
        <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">
          This is the account that will manage your organization in RescueEye — approving detections, assigning
          missions, and adding your team once your registration is approved.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 @md:grid-cols-3">
        <Field label="First Name" htmlFor="admin-first-name">
          <Input
            id="admin-first-name"
            autoComplete="given-name"
            value={values.firstName}
            onChange={(event) => onChange({ firstName: event.target.value })}
            required
          />
        </Field>

        <Field label="Middle Name" htmlFor="admin-middle-name">
          <Input
            id="admin-middle-name"
            autoComplete="additional-name"
            value={values.middleName}
            onChange={(event) => onChange({ middleName: event.target.value })}
            required
          />
        </Field>

        <Field label="Last Name" htmlFor="admin-last-name">
          <Input
            id="admin-last-name"
            autoComplete="family-name"
            value={values.lastName}
            onChange={(event) => onChange({ lastName: event.target.value })}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
        <Field label="Position / Designation" htmlFor="admin-position">
          <select
            id="admin-position"
            value={values.position}
            onChange={(event) => onChange({ position: event.target.value })}
            className={selectClasses}
          >
            <option value="" disabled>
              Select your position
            </option>
            {SAR_POSITIONS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.positions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={OTHER_POSITION}>{OTHER_POSITION}</option>
          </select>
        </Field>

        {values.position === OTHER_POSITION ? (
          <Field label="Your Position" htmlFor="admin-position-other">
            <Input
              id="admin-position-other"
              value={values.positionOther}
              onChange={(event) => onChange({ positionOther: event.target.value })}
              placeholder="e.g. Rescue Operations Coordinator"
              required
            />
          </Field>
        ) : null}

        <Field label="Email Address" htmlFor="admin-email">
          <Input
            id="admin-email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => onChange({ email: event.target.value })}
            required
          />
        </Field>

        <Field label="Mobile Number" htmlFor="admin-phone" hint="PH mobile number.">
          <Input
            id="admin-phone"
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(event) => onChange({ phone: event.target.value })}
            onBlur={() => onChange({ phone: formatPhPhone(values.phone, ['mobile']) })}
            placeholder="0917 123 4567"
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
        <Field label="Password" htmlFor="admin-password" hint="At least 8 characters.">
          <Input
            id="admin-password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(event) => onChange({ password: event.target.value })}
            minLength={8}
            required
          />
        </Field>

        <Field label="Confirm Password" htmlFor="admin-confirm-password">
          <Input
            id="admin-confirm-password"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(event) => onChange({ confirmPassword: event.target.value })}
            minLength={8}
            required
          />
        </Field>
      </div>
    </div>
  )
}
