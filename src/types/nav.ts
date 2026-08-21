import type { ComponentType } from 'react'

export interface NavItem {
  label: string
  href: string
  icon?: ComponentType<{ className?: string }>
  badge?: string | number
}
