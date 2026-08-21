import { useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Card, Field, Input, Button } from '../ui'
import { USER_ROLE_LABEL } from '../../lib/labels'
import type { CreatableUserRole, CreateUserInput, CreateUserResult } from '../../features/agency-admin'

interface UserCreateFormProps {
  onCreate: (input: CreateUserInput) => CreateUserResult
}

const CREATABLE_ROLES: CreatableUserRole[] = ['COMMAND_STAFF', 'FIELD_RESPONDER']

const selectClasses =
  'h-9 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'

export function UserCreateForm({ onCreate }: UserCreateFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<CreatableUserRole>('FIELD_RESPONDER')
  const [error, setError] = useState<string | null>(null)
  const [successName, setSuccessName] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccessName(null)

    const result = onCreate({ name, email, password, role })
    if (!result.ok) {
      setError(result.error)
      return
    }

    setSuccessName(name.trim())
    setName('')
    setEmail('')
    setPassword('')
    setRole('FIELD_RESPONDER')
  }

  return (
    <Card className="flex flex-col gap-4 px-4 py-4">
      {successName ? (
        <div className="flex items-center gap-2 rounded-md border border-success-border bg-success-bg px-3 py-2 text-sm text-success-fg">
          <CheckCircle2 className="size-4 shrink-0" />
          {successName} was created successfully.
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Name" htmlFor="new-user-name">
          <Input
            id="new-user-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
            required
          />
        </Field>

        <Field label="Email" htmlFor="new-user-email" error={error ?? undefined}>
          <Input
            id="new-user-email"
            type="email"
            invalid={!!error}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@agency.org"
            required
          />
        </Field>

        <Field label="Password" htmlFor="new-user-password" hint="Mock credential only — not a real password policy.">
          <Input
            id="new-user-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Temporary password"
            required
            minLength={6}
          />
        </Field>

        <Field label="Role" htmlFor="new-user-role">
          <select
            id="new-user-role"
            value={role}
            onChange={(event) => setRole(event.target.value as CreatableUserRole)}
            className={selectClasses}
          >
            {CREATABLE_ROLES.map((value) => (
              <option key={value} value={value}>
                {USER_ROLE_LABEL[value]}
              </option>
            ))}
          </select>
        </Field>

        <Button type="submit" className="self-start">
          Create User
        </Button>
      </form>
    </Card>
  )
}
