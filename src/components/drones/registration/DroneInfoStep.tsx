import { Field, Input } from '../../ui'
import type { DroneRegistrationData } from './types'

interface DroneInfoStepProps {
  data: DroneRegistrationData
  onChange: (patch: Partial<DroneRegistrationData>) => void
}

const DRONE_TYPE_OPTIONS = [
  { value: 'QUADCOPTER', label: 'Quadcopter' },
  { value: 'FIXED_WING', label: 'Fixed Wing' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'OTHER', label: 'Other' },
] as const

export function DroneInfoStep({ data, onChange }: DroneInfoStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Drone Information</h3>
        <p className="text-sm text-foreground-secondary">Basic details about the drone</p>
      </div>

      <Field label="Drone Name / Unit Name" htmlFor="drone-name" hint="e.g., Sentinel-1, Rescue Alpha">
        <Input
          id="drone-name"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Enter drone name"
        />
      </Field>

      <Field label="Manufacturer" htmlFor="manufacturer" hint="e.g., DJI, Freefly, Parrot">
        <Input
          id="manufacturer"
          value={data.manufacturer}
          onChange={(e) => onChange({ manufacturer: e.target.value })}
          placeholder="Enter manufacturer name"
        />
      </Field>

      <Field label="Model" htmlFor="model" hint="e.g., Matrice 350 RTK, Phantom 4 Pro">
        <Input
          id="model"
          value={data.model}
          onChange={(e) => onChange({ model: e.target.value })}
          placeholder="Enter drone model"
        />
      </Field>

      <Field label="Drone Type / Category" htmlFor="drone-type">
        <select
          id="drone-type"
          value={data.droneType}
          onChange={(e) => onChange({ droneType: e.target.value as typeof data.droneType })}
          className="h-9 w-full rounded-md border border-border-strong bg-surface-secondary px-2 text-sm text-foreground placeholder:text-foreground-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-focus"
        >
          <option value="">Select a type</option>
          {DRONE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  )
}
