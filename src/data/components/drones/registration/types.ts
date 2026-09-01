import type { DroneType, DroneOperationalStatus } from '../../../../types/drone'

export interface DroneRegistrationData {
  name: string
  manufacturer: string
  model: string
  droneType: DroneType
  serialNumber: string
  registrationNumber?: string
  dateAcquired: string
  operationalStatus: DroneOperationalStatus
  assignedOperatorId?: string
  lastInspectionDate?: string
  notes?: string
}

export const EMPTY_REGISTRATION_DATA: DroneRegistrationData = {
  name: '',
  manufacturer: '',
  model: '',
  droneType: 'QUADCOPTER',
  serialNumber: '',
  dateAcquired: new Date().toISOString().split('T')[0],
  operationalStatus: 'ACTIVE',
}
