import { Users } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, EmptyState } from '../ui'
import { USER_ROLE_LABEL } from '../../../lib/labels'
import { formatDateTime } from '../../../lib/formatDateTime'
import { cn } from '../../../lib/cn'
import type { User, UserAccountStatus } from '../../../types/user'

/** Only the fields this table actually displays — deliberately excludes the mock `password` field on the full user record. */
type DisplayUser = Pick<User, 'id' | 'name' | 'email' | 'phone' | 'role' | 'accountStatus' | 'createdAt' | 'teamId'>

interface UserStatusTableProps {
  users: DisplayUser[]
  onSetStatus: (userId: string, status: UserAccountStatus) => void
  /** Briefly highlights one row — e.g. a user just created from the Add Staff wizard. */
  highlightUserId?: string
  /** When given, a Team column lets the Agency Admin move each person between teams. */
  teams?: Array<{ id: string; name: string }>
  onSetTeam?: (userId: string, teamId: string | null) => void
}

const selectClasses =
  'h-8 rounded-md border border-border-strong bg-surface px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'

export function UserStatusTable({ users, onSetStatus, highlightUserId, teams, onSetTeam }: UserStatusTableProps) {
  if (users.length === 0) {
    return <EmptyState icon={Users} title="No staff yet" description="Use Add Staff to create your first account." />
  }

  const showTeams = Boolean(teams && onSetTeam)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Role</TableHead>
          {showTeams ? <TableHead>Team</TableHead> : null}
          <TableHead>Status</TableHead>
          <TableHead>Added</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow
            key={user.id}
            className={cn(
              user.id === highlightUserId && 'motion-safe:transition-colors motion-safe:duration-[2000ms] bg-accent-subtle',
            )}
          >
            <TableCell className="font-medium text-foreground">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.phone ?? '—'}</TableCell>
            <TableCell>{USER_ROLE_LABEL[user.role]}</TableCell>
            {showTeams ? (
              <TableCell>
                <select
                  aria-label={`Team for ${user.name}`}
                  value={user.teamId ?? ''}
                  onChange={(event) => onSetTeam!(user.id, event.target.value || null)}
                  className={selectClasses}
                >
                  <option value="">Unassigned</option>
                  {teams!.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </TableCell>
            ) : null}
            <TableCell>
              <Badge tone={user.accountStatus === 'ACTIVE' ? 'success' : 'neutral'}>
                {user.accountStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell className="whitespace-nowrap text-foreground-muted">{formatDateTime(user.createdAt)}</TableCell>
            <TableCell>
              {user.accountStatus === 'ACTIVE' ? (
                <Button size="sm" variant="danger" onClick={() => onSetStatus(user.id, 'INACTIVE')}>
                  Deactivate
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => onSetStatus(user.id, 'ACTIVE')}>
                  Activate
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
