import { Field, Input } from '../../ui'
import type { DroneRegistrationData } from './types'

interface RegistrationDetailsStepProps {
  data: DroneRegistrationData
  onChange: (patch: Partial<DroneRegistrationData>) => void
  existingSerialNumbers: string[]
  existingRegistrationNumbers: string[]
}

export function RegistrationDetailsStep({
  data,
  onChange,
  existingSerialNumbers,
  existingRegistrationNumbers,
}: RegistrationDetailsStepProps) {
  const serialError = data.serialNumber && existingSerialNumbers.includes(data.serialNumber) ? 'This serial number is already registered' : undefined
  const regNumberError = data.registrationNumber && existingRegistrationNumbers.includes(data.registrationNumber) ? 'This registration number is already in use' : undefined

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Registration Details</h3>
        <p className="text-sm text-foreground-secondary">Identification and registration information</p>
      </div>

      <Field
        label="Serial Number"
        htmlFor="serial-number"
        error={serialError}
        hint="Manufacturer serial number, must be unique in the system"
      >
        <Input
          id="serial-number"
          value={data.serialNumber}
          onChange={(e) => onChange({ serialNumber: e.target.value })}
          placeholder="e.g., DRN-001"
          invalid={!!serialError}
        />
      </Field>

      <Field
        label="Registration / License Number (Optional)"
        htmlFor="registration-number"
        error={regNumberError}
        hint="Official government or agency registration number if applicable"
      >
        <Input
          id="registration-number"
          value={data.registrationNumber || ''}
          onChange={(e) => onChange({ registrationNumber: e.target.value || undefined })}
          placeholder="e.g., REG-2025-0001"
          invalid={!!regNumberError}
        />
      </Field>

      <Field label="Date Acquired" htmlFor="date-acquired" hint="When the drone was purchased/received">
        <Input
          id="date-acquired"
          type="date"
          value={data.dateAcquired}
          onChange={(e) => onChange({ dateAcquired: e.target.value })}
        />
      </Field>
    </div>
  )
}
