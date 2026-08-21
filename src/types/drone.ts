export type DroneConnectionStatus = 'CONNECTED' | 'DISCONNECTED'

export interface Drone {
  id: string
  agencyId: string
  name: string
  serialNumber: string
  connectionStatus: DroneConnectionStatus
  registeredAt: string
  lastConnectedAt?: string
}
