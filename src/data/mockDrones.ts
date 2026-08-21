import type { Drone } from '../types/drone'

export const mockDrones: Drone[] = [
  {
    id: 'drone-1',
    agencyId: 'agency-1',
    name: 'Sentinel-1',
    serialNumber: 'DRN-001',
    connectionStatus: 'CONNECTED',
    registeredAt: '2025-11-06T09:00:00Z',
    lastConnectedAt: '2026-08-20T14:10:00Z',
  },
  {
    id: 'drone-2',
    agencyId: 'agency-1',
    name: 'Sentinel-2',
    serialNumber: 'DRN-002',
    connectionStatus: 'CONNECTED',
    registeredAt: '2025-11-06T09:05:00Z',
    lastConnectedAt: '2026-08-20T13:55:00Z',
  },
  {
    id: 'drone-3',
    agencyId: 'agency-1',
    name: 'Sentinel-3',
    serialNumber: 'DRN-003',
    connectionStatus: 'DISCONNECTED',
    registeredAt: '2026-01-20T09:00:00Z',
    lastConnectedAt: '2026-08-19T18:30:00Z',
  },
]
