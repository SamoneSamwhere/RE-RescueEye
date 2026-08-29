export type DroneConnectionStatus = 'CONNECTED' | 'DISCONNECTED'
export type DroneType = 'QUADCOPTER' | 'FIXED_WING' | 'HYBRID' | 'OTHER'
export type DroneOperationalStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'

export interface Drone {
  id: string
  agencyId: string
  name: string
  model: string
  manufacturer: string
  droneType: DroneType
  serialNumber: string
  registrationNumber?: string
  assignedOperatorId?: string
  dateAcquired: string
  operationalStatus: DroneOperationalStatus
  lastInspectionDate?: string
  notes?: string
  connectionStatus: DroneConnectionStatus
  registeredAt: string
  lastConnectedAt?: string
}
