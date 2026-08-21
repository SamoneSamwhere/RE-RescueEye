import type { Agency } from '../types/agency'

export const mockAgencies: Agency[] = [
  {
    id: 'agency-1',
    name: 'Metro Search & Rescue',
    contactEmail: 'ops@metrosar.org',
    contactPhone: '+1-555-0100',
    registrationStatus: 'APPROVED',
    accountStatus: 'ACTIVE',
    registeredAt: '2025-11-03T09:00:00Z',
    reviewedByUserId: 'usr-system-admin-1',
    reviewedAt: '2025-11-04T15:20:00Z',
  },
  {
    id: 'agency-2',
    name: 'Coastal Emergency Response',
    contactEmail: 'contact@coastal-er.org',
    contactPhone: '+1-555-0142',
    registrationStatus: 'PENDING',
    accountStatus: 'INACTIVE',
    registeredAt: '2026-08-18T11:15:00Z',
  },
  {
    id: 'agency-3',
    name: 'Highland County Fire & Rescue',
    contactEmail: 'admin@highlandfire.gov',
    contactPhone: '+1-555-0178',
    registrationStatus: 'APPROVED',
    accountStatus: 'INACTIVE',
    registeredAt: '2025-06-12T08:30:00Z',
    reviewedByUserId: 'usr-system-admin-1',
    reviewedAt: '2025-06-13T10:00:00Z',
  },
]
