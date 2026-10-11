import { useQuery } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { api } from '../../lib/apiClient'

export type AlertType = 'SMS' | 'PUSH' | 'DASHBOARD'
export type AlertStatus = 'SENT' | 'DELIVERED' | 'FAILED' | 'READ'

/** One row of the alert table, as the API returns it (timestamps in UTC ISO). */
export interface AlertRecord {
  id: number
  incidentId: number
  recipientId: number
  alertType: AlertType
  message: string
  status: AlertStatus
  sentAt: string
  acknowledgedAt: string | null
  updatedAt: string
}

export type AlertFilter = { recipientId: number } | { incidentId: number }

const alertsKey = (filter: AlertFilter) => ['alerts', filter] as const

function query(filter: AlertFilter): string {
  return 'recipientId' in filter ? `recipientId=${filter.recipientId}` : `incidentId=${filter.incidentId}`
}

/** A responder's alert history, or every alert for one incident; kept live by the WebSocket (see upsertAlert). */
export function useAlerts(filter: AlertFilter | null) {
  return useQuery({
    queryKey: filter ? alertsKey(filter) : ['alerts', 'none'],
    queryFn: async () => (await api.get<{ alerts: AlertRecord[] }>(`/alerts?${query(filter!)}`)).alerts,
    enabled: filter !== null,
    staleTime: 30_000,
  })
}

/** Applies an alert pushed over the live socket to every cached list it belongs to. */
export function upsertAlert(queryClient: QueryClient, alert: AlertRecord) {
  for (const cached of queryClient.getQueryCache().findAll({ queryKey: ['alerts'] })) {
    const filter = cached.queryKey[1] as AlertFilter | 'none'
    if (filter === 'none') continue
    const belongs = 'recipientId' in filter ? filter.recipientId === alert.recipientId : filter.incidentId === alert.incidentId
    if (!belongs) continue
    queryClient.setQueryData<AlertRecord[]>(cached.queryKey, (old = []) => {
      const rest = old.filter((a) => a.id !== alert.id)
      return [alert, ...rest].sort((a, b) => b.sentAt.localeCompare(a.sentAt) || b.id - a.id)
    })
  }
}

export function dispatchAlerts(input: { incidentId: number; recipientIds: number[]; dispatchedBy: number; label?: string }) {
  return api.post<{ alerts: AlertRecord[] }>('/alerts/dispatch', input)
}

export function markAlertRead(alertId: number, userId: number) {
  return api.post<AlertRecord>(`/alerts/${alertId}/read`, { userId })
}

export function acknowledgeAlerts(incidentId: number, userId: number) {
  return api.post<{ alerts: AlertRecord[] }>('/alerts/acknowledge', { incidentId, userId })
}

export const ALERT_TYPE_LABEL: Record<AlertType, string> = { SMS: 'SMS', PUSH: 'Push', DASHBOARD: 'In-app' }
export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  READ: 'Read',
}
export const ALERT_STATUS_TONE: Record<AlertStatus, 'neutral' | 'info' | 'success' | 'danger'> = {
  SENT: 'info',
  DELIVERED: 'success',
  FAILED: 'danger',
  READ: 'neutral',
}
