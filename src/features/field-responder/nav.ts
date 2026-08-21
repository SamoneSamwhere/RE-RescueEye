import { Home, UserCircle } from 'lucide-react'
import type { NavItem } from '../../types/nav'
import { ROUTES } from '../../routes/paths'

export const FIELD_RESPONDER_NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: ROUTES.fieldResponder, icon: Home },
  { label: 'Profile', href: ROUTES.fieldResponderProfile, icon: UserCircle },
]
