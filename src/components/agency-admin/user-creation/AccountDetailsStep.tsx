import { KeyRound, Zap } from 'lucide-react'
import { Field, Input } from '../../ui'
import type { AccountValues } from './types'

interface AccountDetailsStepProps {
  values: AccountValues
  onChange: (patch: Partial<AccountValues>) => void
}

export function AccountDetailsStep({ values, onChange }: AccountDetailsStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5 rounded-md border border-accent-border bg-accent-subtle px-3 py-2.5">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-accent" />
        <div>
          <p className="text-xs font-medium text-accent">Account credentials</p>
          <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">
            Set a temporary password for this account. Share it with the new user securely — they can change it
            after signing in.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Password" htmlFor="account-password" hint="At least 8 characters.">
          <Input
            id="account-password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(event) => onChange({ password: event.target.value })}
            minLength={8}
            required
          />
        </Field>

        <Field label="Confirm Password" htmlFor="account-confirm-password">
          <Input
            id="account-confirm-password"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(event) => onChange({ confirmPassword: event.target.value })}
            minLength={8}
            required
          />
        </Field>
      </div>

      <div className="flex items-start gap-2.5 rounded-md border border-border bg-surface-secondary px-3 py-3">
        <Zap className="mt-0.5 size-4 shrink-0 text-foreground-secondary" />
        <div>
          <p className="text-sm font-medium text-foreground">What happens after you create this account</p>
          <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">
            This account is created and activated immediately — there's no separate invitation step. The new user
            can sign in right away with the email and password you set here.
          </p>
        </div>
      </div>
    </div>
  )
}
