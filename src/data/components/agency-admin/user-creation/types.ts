import type { ComponentType } from 'react'
import { ShieldCheck, UsersRound } from 'lucide-react'
import type { CreatableUserRole } from '../../../../features/agency-admin'

export interface PersonnelInfoValues {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export interface AccountValues {
  password: string
  confirmPassword: string
}

export interface RoleOption {
  role: CreatableUserRole
  title: string
  icon: ComponentType<{ className?: string }>
  description: string
  responsibilities: string[]
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'COMMAND_STAFF',
    title: 'Command Staff',
    icon: ShieldCheck,
    description: 'Manages incidents, drone operations, and response coordination.',
    responsibilities: [
      'Reviews AI detections and verifies incidents',
      'Dispatches Field Responders to incidents',
      'Monitors live drone feeds and mission progress',
    ],
  },
  {
    role: 'FIELD_RESPONDER',
    title: 'Field Responder',
    icon: UsersRound,
    description: 'Receives incident assignments and responds in the field.',
    responsibilities: [
      'Receives mission notifications for assigned incidents',
      'Updates status while en route and on site',
      'Reports outcomes from the field',
    ],
  },
]
