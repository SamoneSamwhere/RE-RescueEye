import { Home, Map, UserCircle } from 'lucide-react'
import type { NavItem } from '../../types/nav'
import { ROUTES } from '../../routes/paths'

export const FIELD_RESPONDER_NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: ROUTES.fieldResponder, icon: Home },
  { label: 'Damage Map', href: ROUTES.fieldResponderMap, icon: Map },
  { label: 'Profile', href: ROUTES.fieldResponderProfile, icon: UserCircle },
]
