import type { Notification, AppNotification } from '../types/notification'

/** Notifications for one recipient, newest first, projected to the shell's lightweight shape. */
export function notificationsFor(all: Notification[], recipientUserId: string): AppNotification[] {
  return all
    .filter((n) => n.recipientUserId === recipientUserId)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    .map((n) => ({ id: n.id, title: n.message, timestamp: n.sentAt, read: n.read, type: n.type }))
}
