import { Users } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, EmptyState } from '../ui'
import { USER_ROLE_LABEL } from '../../lib/labels'
import { cn } from '../../lib/cn'
import type { User, UserAccountStatus } from '../../types/user'

/** Only the fields this table actually displays — deliberately excludes the mock `password` field on the full user record. */
type DisplayUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'accountStatus'>

interface UserStatusTableProps {
  users: DisplayUser[]
  onSetStatus: (userId: string, status: UserAccountStatus) => void
  /** Briefly highlights one row — e.g. a user just created from the User Creation wizard. */
  highlightUserId?: string
}

export function UserStatusTable({ users, onSetStatus, highlightUserId }: UserStatusTableProps) {
  if (users.length === 0) {
    return <EmptyState icon={Users} title="No users yet" description="Create a user to see them here." />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
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
            <TableCell>{USER_ROLE_LABEL[user.role]}</TableCell>
            <TableCell>
              <Badge tone={user.accountStatus === 'ACTIVE' ? 'success' : 'neutral'}>
                {user.accountStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              {user.accountStatus === 'ACTIVE' ? (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onSetStatus(user.id, 'INACTIVE')}
                >
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
