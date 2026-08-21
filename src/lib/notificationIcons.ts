import type { ComponentType } from 'react'
import { Bell, ScanSearch, CheckCircle2, ShieldAlert, Send, Repeat, Navigation, MapPin, Flag } from 'lucide-react'
import type { NotificationType } from '../types/notification'

/** Shared per-type icon so every surface that renders a Notification (bell dropdown, panels) looks consistent. */
export const NOTIFICATION_TYPE_ICON: Record<NotificationType, ComponentType<{ className?: string }>> = {
  DETECTION_PENDING_REVIEW: ScanSearch,
  DETECTION_VERIFIED: CheckCircle2,
  INCIDENT_CREATED: ShieldAlert,
  MISSION_DISPATCH: Send,
  MISSION_REASSIGNED: Repeat,
  MISSION_STATUS_CHANGED: Navigation,
  RESPONDER_ON_SITE: MapPin,
  MISSION_COMPLETED: Flag,
  SYSTEM: Bell,
}
