import { Field, Input } from '../../ui'
import type { AdminInfoValues } from './types'

interface AdminInfoStepProps {
  values: AdminInfoValues
  onChange: (patch: Partial<AdminInfoValues>) => void
}

export function AdminInfoStep({ values, onChange }: AdminInfoStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground-secondary">
        This is the account that will manage your agency in RescueEye — approving detections, assigning
        missions, and adding your team once your registration is approved.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full Name" htmlFor="admin-name">
          <Input
            id="admin-name"
            autoComplete="name"
            value={values.fullName}
            onChange={(event) => onChange({ fullName: event.target.value })}
            required
          />
        </Field>

        <Field label="Position / Designation" htmlFor="admin-position">
          <Input
            id="admin-position"
            value={values.position}
            onChange={(event) => onChange({ position: event.target.value })}
            placeholder="Operations Director"
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        <Field label="Contact Number" htmlFor="admin-phone">
          <Input
            id="admin-phone"
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(event) => onChange({ phone: event.target.value })}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
