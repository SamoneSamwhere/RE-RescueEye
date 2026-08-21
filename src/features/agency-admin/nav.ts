import { LayoutDashboard, UserPlus, Users, History } from 'lucide-react'
import type { NavItem } from '../../types/nav'
import { ROUTES } from '../../routes/paths'

export const AGENCY_ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.agencyAdmin, icon: LayoutDashboard },
  { label: 'Create User', href: ROUTES.agencyAdminUserCreation, icon: UserPlus },
  { label: 'Account Status', href: ROUTES.agencyAdminAccountStatus, icon: Users },
  { label: 'Mission History', href: ROUTES.agencyAdminMissionHistory, icon: History },
]
