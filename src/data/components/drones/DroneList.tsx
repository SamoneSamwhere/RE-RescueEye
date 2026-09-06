import { Radio, Plus } from 'lucide-react'
import { Panel, Button, EmptyState } from '../ui'
import { DroneCard } from './DroneCard'
import type { Drone } from '../../../types/drone'

interface DroneListProps {
  drones: Drone[]
  connectingDroneId: string | null
  liveDroneIds: string[]
  onConnect: (droneId: string) => void
  onSelectFeedSource: (droneId: string) => void
  onViewLive: () => void
  onRegisterClick: () => void
  onAddDemoDrone: () => void
}

export function DroneList({
  drones,
  connectingDroneId,
  liveDroneIds,
  onConnect,
  onSelectFeedSource,
  onViewLive,
  onRegisterClick,
  onAddDemoDrone,
}: DroneListProps) {
  return (
    <Panel
      title="Registered Drones"
      actions={
        <>
          <Button size="sm" variant="outline" onClick={onAddDemoDrone}>
            <Plus className="size-3.5" />
            Add Demo Drone
          </Button>
          <Button size="sm" onClick={onRegisterClick}>
            Register Drone
          </Button>
        </>
      }
    >
      {drones.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No drones registered"
          description="Register a drone for real operations, or add a demo drone to try the feed workflow without one."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" onClick={onAddDemoDrone}>
                <Plus className="size-3.5" />
                Add Demo Drone
              </Button>
              <Button size="sm" variant="outline" onClick={onRegisterClick}>
                Register Drone
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {drones.map((drone) => (
            <DroneCard
              key={drone.id}
              drone={drone}
              isConnecting={connectingDroneId === drone.id}
              isLive={liveDroneIds.includes(drone.id)}
              onConnect={onConnect}
              onSelectFeedSource={onSelectFeedSource}
              onViewLive={onViewLive}
            />
          ))}
        </div>
      )}
    </Panel>
  )
}
