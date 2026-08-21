import { LayoutDashboard, Video, ScanSearch, ShieldCheck, Map } from 'lucide-react'
import type { NavItem } from '../../types/nav'
import { ROUTES } from '../../routes/paths'

export const COMMAND_STAFF_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.commandStaff, icon: LayoutDashboard },
  { label: 'Drones & Media', href: ROUTES.commandStaffMedia, icon: Video },
  { label: 'Detection Review', href: ROUTES.commandStaffDetections, icon: ScanSearch },
  { label: 'Incidents', href: ROUTES.commandStaffIncidents, icon: ShieldCheck },
  { label: 'Operational Map', href: ROUTES.commandStaffMap, icon: Map },
]
