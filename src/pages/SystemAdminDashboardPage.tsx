import { Link } from 'react-router-dom'
import { Building2, ShieldCheck, ShieldAlert, Power, ArrowRight } from 'lucide-react'
import { AppShell, PageHeader } from '../components/layout'
import { Card, Badge } from '../components/ui'
import { Reveal } from '../components/landing/Reveal'
import { StatTile } from '../components/dashboard'
import { useAuth } from '../features/auth'
import { SYSTEM_ADMIN_NAV_ITEMS, useSystemAdminData } from '../features/system-admin'
import { ROUTES } from '../routes/paths'
import { formatDateTime } from '../lib/formatDateTime'

const ACTIONS = [
  {
    href: ROUTES.systemAdminAgencyValidation,
    icon: ShieldCheck,
    title: 'Agency Validation',
    description: 'Approve or reject pending agency registrations.',
  },
  {
    href: ROUTES.systemAdminAgencyStatus,
    icon: Power,
    title: 'Agency Account Status Management',
    description: 'Activate or deactivate approved agencies.',
  },
]

export function SystemAdminDashboardPage() {
  const { session, logout } = useAuth()
  const { agencies } = useSystemAdminData()

  if (!session) return null

  const pendingCount = agencies.filter((a) => a.registrationStatus === 'PENDING').length
  const approvedCount = agencies.filter((a) => a.registrationStatus === 'APPROVED').length
  const rejectedCount = agencies.filter((a) => a.registrationStatus === 'REJECTED').length
  const activeCount = agencies.filter((a) => a.accountStatus === 'ACTIVE').length

  const sortedAgencies = [...agencies].sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))

  return (
    <AppShell
      user={{ name: session.name, role: session.role, agencyName: session.agencyName }}
      navItems={SYSTEM_ADMIN_NAV_ITEMS}
      onLogout={logout}
    >
      <PageHeader title="System Admin Dashboard" description="Registered agencies across the platform." />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Pending Review" value={pendingCount} icon={ShieldAlert} tone="warning" />
            <StatTile label="Approved Agencies" value={approvedCount} icon={ShieldCheck} tone="success" />
            <StatTile label="Rejected" value={rejectedCount} icon={Building2} tone="danger" />
            <StatTile label="Active Accounts" value={activeCount} icon={Power} tone="info" />
          </div>
        </Reveal>

        <Reveal delayMs={100}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {ACTIONS.map((action) => (
              <Link key={action.href} to={action.href}>
                <Card className="flex h-full flex-col gap-3 px-4 py-4 transition-colors hover:bg-surface-secondary">
                  <span className="flex size-9 items-center justify-center rounded-md bg-accent-subtle text-accent">
                    <action.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{action.title}</p>
                    <p className="mt-1 text-xs text-foreground-secondary">{action.description}</p>
                  </div>
                  <p className="mt-auto flex items-center gap-1 text-xs font-medium text-accent">
                    Go
                    <ArrowRight className="size-3.5" />
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </Reveal>

        <Reveal delayMs={200}>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
              Registered Agencies ({agencies.length})
            </p>
            {sortedAgencies.map((agency) => (
              <Card key={agency.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{agency.name}</p>
                  <p className="text-xs text-foreground-muted">
                    {agency.contactEmail} · Registered {formatDateTime(agency.registeredAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      agency.registrationStatus === 'APPROVED'
                        ? 'success'
                        : agency.registrationStatus === 'REJECTED'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {agency.registrationStatus}
                  </Badge>
                  <Badge tone={agency.accountStatus === 'ACTIVE' ? 'success' : 'neutral'}>
                    {agency.accountStatus}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </Reveal>
      </div>
    </AppShell>
  )
}
