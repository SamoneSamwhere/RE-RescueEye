import { Link } from 'react-router-dom'
import { Building2, ShieldCheck, ShieldAlert, Power, ArrowRight, FileWarning } from 'lucide-react'
import { PageHeader } from '../data/components/layout'
import { Card, Badge, Panel } from '../data/components/ui'
import { Reveal } from '../data/components/landing/Reveal'
import { BarList, BreakdownBar, StatTile } from '../data/components/dashboard'
import { categoryForType } from '../data/components/landing/registration/types'
import { useSystemAdminData } from '../features/system-admin'
import { ROUTES } from '../routes/paths'
import { formatDateTime } from '../lib/formatDateTime'

export function SystemAdminDashboardPage() {
  const { agencies } = useSystemAdminData()

  const pendingCount = agencies.filter((a) => a.registrationStatus === 'PENDING').length
  const approvedCount = agencies.filter((a) => a.registrationStatus === 'APPROVED').length
  const rejectedCount = agencies.filter((a) => a.registrationStatus === 'REJECTED').length
  const resubmissionCount = agencies.filter((a) => a.registrationStatus === 'RESUBMISSION_REQUIRED').length
  const activeCount = agencies.filter((a) => a.accountStatus === 'ACTIVE').length

  // Organizations by the category that decides their documents — tells the
  // reviewer what kind of evidence the queue will ask them to check.
  const CATEGORY_LABEL = { government: 'Government offices', registered: 'Registered NGOs / private', volunteer: 'Volunteer groups' } as const
  const byCategory = (Object.keys(CATEGORY_LABEL) as Array<keyof typeof CATEGORY_LABEL>).map((c) => ({
    label: CATEGORY_LABEL[c],
    value: agencies.filter((a) => categoryForType(a.agencyType) === c).length,
  }))

  // Review speed: how long a registration waits for a decision, and who has
  // waited longest right now — the one number this role can act on today.
  const DAY_MS = 86_400_000
  const reviewed = agencies.filter((a) => a.reviewedAt && a.registrationStatus !== 'PENDING')
  const avgReviewDays = reviewed.length
    ? reviewed.reduce((sum, a) => sum + (Date.parse(a.reviewedAt!) - Date.parse(a.registeredAt)), 0) / reviewed.length / DAY_MS
    : null
  const oldestPending = agencies
    .filter((a) => a.registrationStatus === 'PENDING')
    .sort((a, b) => a.registeredAt.localeCompare(b.registeredAt))[0]
  const oldestPendingDays = oldestPending ? Math.floor((Date.now() - Date.parse(oldestPending.registeredAt)) / DAY_MS) : null

  const recentAgencies = [...agencies]
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
    .slice(0, 5)

  return (
    <>
      <PageHeader title="System Admin Dashboard" description="Registered agencies across the platform." />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="Pending Review" value={pendingCount} icon={ShieldAlert} tone="warning" />
            <StatTile label="Needs Resubmission" value={resubmissionCount} icon={FileWarning} tone="warning" />
            <StatTile label="Approved Organizations" value={approvedCount} icon={ShieldCheck} tone="success" />
            <StatTile label="Rejected" value={rejectedCount} icon={Building2} tone="danger" />
            <StatTile label="Active Accounts" value={activeCount} icon={Power} tone="info" />
          </div>
        </Reveal>

        <Reveal delayMs={50}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel title="Registrations by Status">
              <BreakdownBar
                emptyLabel="No registrations yet"
                segments={[
                  { label: 'Pending', value: pendingCount, tone: 'warning' },
                  { label: 'Resubmission', value: resubmissionCount, tone: 'info' },
                  { label: 'Approved', value: approvedCount, tone: 'success' },
                  { label: 'Rejected', value: rejectedCount, tone: 'danger' },
                ]}
              />
            </Panel>
            <Panel title="Organizations by Category">
              <BarList items={byCategory} unit="organizations" />
            </Panel>
            <Panel title="Review Speed">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xl font-semibold leading-tight text-foreground">
                    {avgReviewDays === null ? '—' : avgReviewDays < 1 ? '< 1' : avgReviewDays.toFixed(1)}
                  </p>
                  <p className="text-xs text-foreground-secondary">Avg. days to a decision</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold leading-tight text-foreground">
                    {oldestPendingDays === null ? '—' : oldestPendingDays}
                  </p>
                  <p className="text-xs text-foreground-secondary">
                    {oldestPending ? `Days waiting · ${oldestPending.name}` : 'No one waiting'}
                  </p>
                </div>
              </div>
            </Panel>
          </div>
        </Reveal>

        <Reveal delayMs={200}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
                Recently Registered
              </p>
              <Link
                to={ROUTES.systemAdminAgencyStatus}
                className="flex items-center gap-1 text-xs font-medium text-accent"
              >
                View all ({agencies.length})
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {recentAgencies.map((agency) => (
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
    </>
  )
}
