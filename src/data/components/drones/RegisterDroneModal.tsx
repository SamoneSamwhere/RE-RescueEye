import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal, Field, Input, Button } from '../ui'

interface RegisterDroneModalProps {
  open: boolean
  onClose: () => void
  onRegister: (input: { name: string; serialNumber: string }) => void
  existingSerialNumbers: string[]
}

export function RegisterDroneModal({ open, onClose, onRegister, existingSerialNumbers }: RegisterDroneModalProps) {
  const [name, setName] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setSerialNumber('')
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const trimmedName = name.trim()
    const trimmedSerial = serialNumber.trim()

    if (!trimmedName || !trimmedSerial) {
      setError('Drone name and serial number are required.')
      return
    }
    if (existingSerialNumbers.includes(trimmedSerial)) {
      setError('A drone with this serial number is already registered.')
      return
    }

    onRegister({ name: trimmedName, serialNumber: trimmedSerial })
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Register Drone"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="register-drone-form">
            Register
          </Button>
        </>
      }
    >
      <form id="register-drone-form" className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <Field label="Drone Name" htmlFor="drone-name">
          <Input id="drone-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sentinel-4" />
        </Field>
        <Field label="Serial Number" htmlFor="drone-serial">
          <Input
            id="drone-serial"
            value={serialNumber}
            onChange={(event) => setSerialNumber(event.target.value)}
            placeholder="e.g. DRN-004"
          />
        </Field>
        {error ? <p className="text-xs text-danger-fg">{error}</p> : null}
        <p className="text-xs text-foreground-muted">
          The drone will be registered as disconnected. Connect it before selecting a feed source.
        </p>
      </form>
    </Modal>
  )
}
