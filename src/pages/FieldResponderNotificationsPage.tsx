import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, ChevronRight, Inbox, MessageSquare, Smartphone, MonitorSmartphone } from 'lucide-react'
import { MobileShell } from '../components/layout'
import { Card, Badge, PriorityBadge, EmptyState, LoadingState } from '../components/ui'
import { Reveal } from '../components/landing/Reveal'
import { useAuth } from '../features/auth'
import { FIELD_RESPONDER_NAV_ITEMS, useFieldResponderData } from '../features/field-responder'
import { useAlerts, markAlertRead, upsertAlert, ALERT_STATUS_LABEL, ALERT_STATUS_TONE } from '../features/alerts'
import type { AlertRecord, AlertType } from '../features/alerts'
import { useToast } from '../features/toast'
import { getIncidentsByIds } from '../db/incidents'
import { isDbId } from '../lib/incidentClassification'
import { formatDateTime } from '../lib/formatDateTime'
import { notificationsFor } from '../lib/notifications'
import { useNotificationStore } from '../state/NotificationStore'
import { fieldResponderMissionDetailPath } from '../routes/paths'
import { cn } from '../lib/cn'

const INCIDENT_TYPE_NAME: Record<string, string> = {
  VICTIM_DETECTED: 'Casualty',
  FIRE: 'Fire',
  FLOOD: 'Flood',
  STRUCTURAL: 'Structural',
  UNKNOWN: 'Unclassified',
}

const CHANNEL_ICON: Record<AlertType, typeof MessageSquare> = {
  SMS: MessageSquare,
  PUSH: Smartphone,
  DASHBOARD: MonitorSmartphone,
}
const CHANNEL_NAME: Record<AlertType, string> = { SMS: 'SMS', PUSH: 'Push', DASHBOARD: 'In-app' }

/** One dispatch: the SMS, PUSH and DASHBOARD alerts sent together for one incident. */
interface AlertGroup {
  key: string
  incidentId: number
  sentAt: string
  message: string
  primary: AlertRecord
  channels: AlertRecord[]
}

function groupAlerts(alerts: AlertRecord[]): AlertGroup[] {
  const groups = new Map<string, AlertRecord[]>()
  for (const alert of alerts) {
    const key = `${alert.incidentId}|${alert.sentAt}`
    groups.set(key, [...(groups.get(key) ?? []), alert])
  }
  return [...groups.entries()]
    .map(([key, channels]) => {
      const primary = channels.find((a) => a.alertType === 'DASHBOARD') ?? channels[0]
      return { key, incidentId: primary.incidentId, sentAt: primary.sentAt, message: primary.message, primary, channels }
    })
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
}

/**
 * Every alert this responder has been sent, newest first. Opening one marks it
 * READ (and records when it was acknowledged), then opens the mission so the
 * responder can accept or decline it.
 */
export function FieldResponderNotificationsPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { missions } = useFieldResponderData()
  const { notifications: allNotifications } = useNotificationStore()

  const userId = session && isDbId(session.id) ? Number(session.id) : null
  const { data: alerts = [], isLoading, error } = useAlerts(userId !== null ? { recipientId: userId } : null)
  const groups = useMemo(() => groupAlerts(alerts), [alerts])

  const incidentIds = useMemo(() => [...new Set(groups.map((g) => g.incidentId))].sort((a, b) => a - b), [groups])
  const { data: incidentRows = [] } = useQuery({
    queryKey: ['alertIncidents', incidentIds],
    queryFn: () => getIncidentsByIds(incidentIds),
    enabled: incidentIds.length > 0,
    staleTime: 60_000,
  })
  const incidentById = new Map(incidentRows.map((row) => [row.id, row]))

  const notifications = session ? notificationsFor(allNotifications, session.id) : []

  async function open(group: AlertGroup) {
    if (userId === null) return
    if (group.primary.status !== 'READ') {
      try {
        upsertAlert(queryClient, await markAlertRead(group.primary.id, userId))
      } catch {
        // Opening the mission matters more than the read receipt; the socket will catch up.
      }
    }
    const mission = missions
      .filter((m) => m.incidentId === String(group.incidentId))
      .sort((a, b) => b.dispatchedAt.localeCompare(a.dispatchedAt))[0]
    if (mission) navigate(fieldResponderMissionDetailPath(mission.id))
    else toast.info('This mission is no longer assigned to you.', 'Mission unavailable')
  }

  if (!session) return null

  return (
    <MobileShell navItems={FIELD_RESPONDER_NAV_ITEMS} notifications={notifications}>
      <div className="flex flex-col gap-4 px-4 pb-6 pt-5">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-foreground-secondary">Every mission alert sent to you. Tap one to open the mission.</p>
        </header>

        {userId === null ? (
          <Card className="px-4 py-3">
            <EmptyState
              icon={Inbox}
              title="No alert history for demo accounts"
              description="Alerts are recorded for accounts created through your agency."
            />
          </Card>
        ) : isLoading ? (
          <LoadingState label="Loading alerts…" />
        ) : error ? (
          <Card className="px-4 py-3">
            <EmptyState icon={Inbox} title="Could not load alerts" description={error instanceof Error ? error.message : undefined} />
          </Card>
        ) : groups.length === 0 ? (
          <Card className="px-4 py-3">
            <EmptyState icon={BellRing} title="No alerts yet" description="When you are dispatched to an incident, the alert appears here." />
          </Card>
        ) : (
          <Reveal className="flex flex-col gap-2">
            {groups.map((group) => {
              const incident = incidentById.get(group.incidentId)
              const unread = group.primary.status !== 'READ'
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => open(group)}
                  className={cn(
                    'flex w-full flex-col gap-2 rounded-lg border bg-surface px-4 py-3 text-left shadow-panel transition-colors hover:bg-surface-secondary',
                    unread ? 'border-accent/50' : 'border-border',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      {unread ? <span className="size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" /> : null}
                      <span className={cn('truncate text-sm text-foreground', unread ? 'font-semibold' : 'font-medium')}>
                        {incident ? INCIDENT_TYPE_NAME[incident.incidentType] ?? 'Incident' : 'Incident'} alert
                      </span>
                      {incident ? <PriorityBadge priority={incident.severity} /> : null}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-foreground-muted" />
                  </div>
                  <p className="line-clamp-3 text-sm text-foreground-secondary">{group.message}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-foreground-muted">{formatDateTime(group.sentAt)}</span>
                    <Badge tone={ALERT_STATUS_TONE[group.primary.status]}>{ALERT_STATUS_LABEL[group.primary.status]}</Badge>
                  </div>
                  <ul className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-2 text-[11px] text-foreground-muted">
                    {group.channels
                      .slice()
                      .sort((a, b) => a.alertType.localeCompare(b.alertType))
                      .map((alert) => {
                        const Icon = CHANNEL_ICON[alert.alertType]
                        return (
                          <li key={alert.id} className="flex items-center gap-1">
                            <Icon className="size-3" />
                            {CHANNEL_NAME[alert.alertType]}:
                            <span className={cn('font-medium', alert.status === 'FAILED' ? 'text-danger-fg' : 'text-foreground-secondary')}>
                              {ALERT_STATUS_LABEL[alert.status]}
                            </span>
                          </li>
                        )
                      })}
                  </ul>
                </button>
              )
            })}
          </Reveal>
        )}
      </div>
    </MobileShell>
  )
}
