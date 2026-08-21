import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth, ROLE_HOME_ROUTE } from '../features/auth'
import { mockUsers } from '../data/mockUsers'
import { Card, CardContent, CardHeader, CardTitle, Field, Input, Button } from '../components/ui'
import { AuthPageShell, Reveal } from '../components/landing'
import { ROUTES } from '../routes/paths'

export function LoginPage() {
  const { login, session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (session) {
    return <Navigate to={ROLE_HOME_ROUTE[session.role]} replace />
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result = login(email, password)
    if (!result.ok) {
      setError(result.error)
    }
  }

  function fillDemoAccount(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setError(null)
  }

  return (
    <AuthPageShell>
      <Reveal className="w-full max-w-sm lg:max-w-5xl">
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <ShieldAlert className="size-8 text-accent" />
          <h1 className="text-xl font-semibold tracking-tight text-foreground-inverse">RescueEye</h1>
          <p className="text-sm text-foreground-inverse/70">Sign in to the disaster response platform</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)_minmax(0,1fr)] lg:items-start">
          <Card className="shadow-modal lg:col-start-2">
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
                <Field label="Email" htmlFor="email">
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </Field>
                <Field label="Password" htmlFor="password">
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </Field>

                {error ? (
                  <p
                    role="alert"
                    className="rounded-md border border-danger-border bg-danger-bg px-2 py-2 text-sm text-danger-fg"
                  >
                    {error}
                  </p>
                ) : null}

                <Button type="submit" className="w-full">
                  Sign in
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-foreground-secondary">
                Don&apos;t have an account?{' '}
                <Link to={ROUTES.signup} className="font-medium text-accent hover:underline">
                  Sign up
                </Link>
              </p>
            </CardContent>
          </Card>

          <div className="rounded-md border border-white/15 bg-white/5 px-3 py-3 backdrop-blur lg:col-start-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground-inverse/70">
              Demo accounts (mock auth)
            </p>
            <ul className="flex flex-col gap-1">
              {mockUsers.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => fillDemoAccount(user.email, user.password)}
                    className="group flex w-full items-center justify-between gap-3 rounded-sm px-1 py-1 text-left text-xs text-foreground-inverse/60 transition-colors hover:bg-white/10 hover:text-foreground-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <span className="font-mono">{user.email}</span>
                    <span className="shrink-0 uppercase tracking-wide text-foreground-inverse/40 group-hover:text-foreground-inverse/70">
                      {user.role.replace('_', ' ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </AuthPageShell>
  )
}
