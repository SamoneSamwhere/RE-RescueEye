import { Bell } from 'lucide-react'
import { Panel, EmptyState } from '../ui'
import { formatDateTime } from '../../lib/formatDateTime'
import { NOTIFICATION_TYPE_ICON } from '../../lib/notificationIcons'
import { cn } from '../../lib/cn'
import type { Notification } from '../../types/notification'

interface RecentNotificationsPanelProps {
  notifications: Notification[]
}

export function RecentNotificationsPanel({ notifications }: RecentNotificationsPanelProps) {
  return (
    <Panel title="Recent Notifications">
      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No recent notifications" />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {notifications.map((notification) => {
            const Icon = NOTIFICATION_TYPE_ICON[notification.type]
            return (
              <li key={notification.id} className="flex gap-2 py-2 first:pt-0 last:pb-0">
                <Icon className="mt-0.5 size-4 shrink-0 text-foreground-muted" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {!notification.read ? <span className="size-1.5 shrink-0 rounded-full bg-accent" /> : null}
                    <p className={cn('text-sm text-foreground', !notification.read && 'font-medium')}>
                      {notification.message}
                    </p>
                  </div>
                  <p className="text-xs text-foreground-muted">{formatDateTime(notification.sentAt)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
