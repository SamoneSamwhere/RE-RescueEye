import { Loader2, Radio, Video } from 'lucide-react'
import { Panel, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, StatusIndicator, EmptyState } from '../ui'
import { formatDateTime } from '../../lib/formatDateTime'
import type { Drone } from '../../types/drone'

interface DroneListProps {
  drones: Drone[]
  connectingDroneId: string | null
  selectedDroneId: string | null
  onConnect: (droneId: string) => void
  onSelectFeedSource: (droneId: string) => void
  onRegisterClick: () => void
}

export function DroneList({
  drones,
  connectingDroneId,
  selectedDroneId,
  onConnect,
  onSelectFeedSource,
  onRegisterClick,
}: DroneListProps) {
  return (
    <Panel
      title="Registered Drones"
      actions={
        <Button size="sm" onClick={onRegisterClick}>
          Register Drone
        </Button>
      }
    >
      {drones.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No drones registered"
          description="Register a drone before connecting it and selecting a feed source."
          action={
            <Button size="sm" onClick={onRegisterClick}>
              Register Drone
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Drone</TableHead>
              <TableHead>Serial</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Connected</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {drones.map((drone) => {
              const isConnecting = connectingDroneId === drone.id
              const isConnected = drone.connectionStatus === 'CONNECTED'
              const isSelected = selectedDroneId === drone.id

              return (
                <TableRow key={drone.id} className={isSelected ? 'bg-accent-subtle/40' : undefined}>
                  <TableCell className="font-medium text-foreground">{drone.name}</TableCell>
                  <TableCell className="font-mono text-foreground-secondary">{drone.serialNumber}</TableCell>
                  <TableCell>
                    {isConnecting ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-foreground-secondary">
                        <Loader2 className="size-3.5 animate-spin" />
                        Connecting…
                      </span>
                    ) : (
                      <StatusIndicator
                        tone={isConnected ? 'success' : 'neutral'}
                        label={isConnected ? 'Connected' : 'Disconnected'}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-foreground-secondary">
                    {drone.lastConnectedAt ? formatDateTime(drone.lastConnectedAt) : '—'}
                  </TableCell>
                  <TableCell>
                    {isConnected ? (
                      <Button size="sm" variant={isSelected ? 'secondary' : 'outline'} onClick={() => onSelectFeedSource(drone.id)}>
                        <Video className="size-3.5" />
                        Select Feed Source
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled={isConnecting} onClick={() => onConnect(drone.id)}>
                        {isConnecting ? 'Connecting…' : 'Connect'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}
