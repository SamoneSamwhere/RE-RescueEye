import { Building2, ClipboardCheck, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { DetailField } from '../../ui'
import { ROLE_OPTIONS } from './types'
import type { CreatableUserRole } from '../../../../features/agency-admin'

interface ReviewStepProps {
  fullName: string
  email: string
  phone: string
  role: CreatableUserRole
  agencyName: string
}

export function ReviewStep({ fullName, email, phone, role, agencyName }: ReviewStepProps) {
  const roleOption = ROLE_OPTIONS.find((option) => option.role === role)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5 rounded-md border border-accent-border bg-accent-subtle px-3 py-2.5">
        <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-accent" />
        <div>
          <p className="text-xs font-medium text-accent">Review &amp; create</p>
          <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">
            Double-check the details below. You can go back to fix anything before creating the account.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-md border border-border bg-surface-secondary px-4 py-4 sm:grid-cols-2">
        <DetailField icon={UserRound} label="Full Name" value={fullName} />
        <DetailField icon={Mail} label="Email" value={email} />
        <DetailField icon={Phone} label="Contact Number" value={phone} />
        <DetailField icon={Building2} label="Agency" value={agencyName} />
        <DetailField icon={ShieldCheck} label="Role" value={roleOption?.title ?? role} />
      </div>

      {roleOption ? (
        <p className="text-xs leading-relaxed text-foreground-muted">{roleOption.description}</p>
      ) : null}
    </div>
  )
}
