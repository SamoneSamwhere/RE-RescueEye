import { useState } from 'react'
import type { FormEvent } from 'react'
import { Crown, Info, Plus, Trash2, UserMinus, Users } from 'lucide-react'
import { PageHeader } from '../data/components/layout'
import { Reveal } from '../data/components/landing/Reveal'
import { Badge, Button, Card, EmptyState, Input, Panel } from '../data/components/ui'
import { useAgencyAdminData } from '../features/agency-admin'
import type { Team } from '../features/agency-admin'
import { USER_ROLE_LABEL } from '../lib/labels'
import type { MockUser } from '../data/mockUsers'

const selectClasses =
  'h-8 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'

/**
 * Teams — grouping personnel into response teams.
 *
 * Who is responsible: the Agency Admin. They already own every personnel
 * account (create, activate, deactivate), so they also own who is on which
 * team and who leads it. Command Staff dispatch teams during an operation but
 * do not change their make-up, which keeps a roster from being reshuffled
 * mid-operation by whoever happens to be on shift.
 */
export function AgencyAdminTeamsPage() {
  const { agencyUsers, teams, teamsAvailable, teamsError, createTeam, deleteTeam, setTeamLeader, setUserTeam } =
    useAgencyAdminData()
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<string | null>) {
    setError(null)
    setBusy(true)
    const err = await action()
    setBusy(false)
    if (err) setError(err)
    return !err
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    const name = newName.trim()
    if (name.length < 2) {
      setError('Give the team a name of at least 2 characters.')
      return
    }
    if (teams.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      setError('A team with this name already exists.')
      return
    }
    if (await run(() => createTeam(name))) setNewName('')
  }

  function handleDelete(team: Team, memberCount: number) {
    const note = memberCount > 0 ? ` Its ${memberCount} member(s) will become unassigned.` : ''
    if (!window.confirm(`Delete team "${team.name}"?${note}`)) return
    void run(() => deleteTeam(team.id))
  }

  const membersOf = (teamId: string) => agencyUsers.filter((u) => u.teamId === teamId)
  const unassigned = agencyUsers.filter((u) => !u.teamId || !teams.some((t) => t.id === u.teamId))

  return (
    <>
      <PageHeader title="Teams" description="Group your personnel into response teams and choose who leads each one." />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal>
          <div className="flex items-start gap-2 rounded-md border border-accent-border bg-accent-subtle px-3 py-2.5 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-accent" />
            <p className="text-foreground-secondary">
              <span className="font-medium text-foreground">You, the Agency Admin, manage teams.</span> You create teams,
              assign personnel, and pick each team&apos;s leader. Command Staff dispatch teams during operations but
              cannot change who is on them.
            </p>
          </div>
        </Reveal>

        {!teamsAvailable ? (
          <Reveal delayMs={100}>
            <Panel title="Teams">
              <EmptyState icon={Users} title="Teams are not available yet" description={teamsError ?? undefined} />
            </Panel>
          </Reveal>
        ) : (
          <>
            <Reveal delayMs={100}>
              <Panel title="Create a Team">
                <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-2">
                  <Input
                    aria-label="Team name"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="e.g. Alpha Team, Water Rescue Unit"
                    maxLength={60}
                    className="min-w-56 flex-1"
                  />
                  <Button type="submit" size="sm" disabled={busy}>
                    <Plus className="size-3.5" />
                    Create Team
                  </Button>
                </form>
              </Panel>
            </Reveal>

            {error ? (
              <p role="alert" className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg">
                {error}
              </p>
            ) : null}

            <Reveal delayMs={150}>
              {teams.length === 0 ? (
                <Panel title="Teams (0)">
                  <EmptyState icon={Users} title="No teams yet" description="Create your first team above." />
                </Panel>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {teams.map((team) => {
                    const members = membersOf(team.id)
                    return (
                      <Card key={team.id} className="flex flex-col gap-3 px-4 py-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{team.name}</p>
                            <p className="text-xs text-foreground-muted">{members.length} member(s)</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Delete ${team.name}`}
                            onClick={() => handleDelete(team, members.length)}
                            disabled={busy}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>

                        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-foreground-secondary">
                          Team Leader
                          <select
                            value={team.leaderUserId ?? ''}
                            onChange={(event) => void run(() => setTeamLeader(team.id, event.target.value || null))}
                            className={selectClasses}
                            disabled={busy || members.length === 0}
                          >
                            <option value="">{members.length === 0 ? 'Add members first' : 'No leader'}</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        {members.length === 0 ? (
                          <p className="text-sm text-foreground-muted">No members yet — add people from Unassigned Personnel below.</p>
                        ) : (
                          <ul className="flex flex-col divide-y divide-border">
                            {members.map((m) => (
                              <MemberRow
                                key={m.id}
                                user={m}
                                isLeader={team.leaderUserId === m.id}
                                disabled={busy}
                                onRemove={() => void run(() => setUserTeam(m.id, null))}
                              />
                            ))}
                          </ul>
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}
            </Reveal>

            <Reveal delayMs={200}>
              <Panel title={`Unassigned Personnel (${unassigned.length})`}>
                {unassigned.length === 0 ? (
                  <p className="text-sm text-foreground-muted">Everyone is on a team.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {unassigned.map((u) => (
                      <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.name}</p>
                          <p className="text-xs text-foreground-muted">
                            {USER_ROLE_LABEL[u.role]}
                            {u.accountStatus !== 'ACTIVE' ? ' · Inactive' : ''}
                          </p>
                        </div>
                        <select
                          aria-label={`Add ${u.name} to a team`}
                          value=""
                          onChange={(event) => event.target.value && void run(() => setUserTeam(u.id, event.target.value))}
                          className={`${selectClasses} w-48`}
                          disabled={busy || teams.length === 0}
                        >
                          <option value="">{teams.length === 0 ? 'Create a team first' : 'Add to team…'}</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </Reveal>
          </>
        )}
      </div>
    </>
  )
}

function MemberRow({
  user,
  isLeader,
  disabled,
  onRemove,
}: {
  user: MockUser
  isLeader: boolean
  disabled: boolean
  onRemove: () => void
}) {
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-sm text-foreground">
          {user.name}
          {isLeader ? (
            <Badge tone="info">
              <Crown className="size-3" />
              Leader
            </Badge>
          ) : null}
        </p>
        <p className="text-xs text-foreground-muted">{USER_ROLE_LABEL[user.role]}</p>
      </div>
      <Button size="sm" variant="ghost" onClick={onRemove} disabled={disabled} aria-label={`Remove ${user.name} from team`}>
        <UserMinus className="size-3.5" />
      </Button>
    </li>
  )
}
