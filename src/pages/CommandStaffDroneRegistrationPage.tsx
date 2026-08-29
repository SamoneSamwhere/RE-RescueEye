import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { RegistrationStepper } from '../components/landing/registration'
import {
  DroneInfoStep,
  RegistrationDetailsStep,
  AssignmentStep,
  ReviewStep,
  type DroneRegistrationData,
  EMPTY_REGISTRATION_DATA,
} from '../components/drones/registration'
import { Card, Button } from '../components/ui'
import { useAuth } from '../features/auth'
import { useCommandStaffData } from '../features/command-staff'
import { useUserStore } from '../state/UserStore'
import { ROUTES } from '../routes/paths'

const STEP_LABELS = ['Drone Info', 'Registration', 'Assignment', 'Review']

function validateDroneInfo(data: DroneRegistrationData): string | null {
  if (!data.name.trim()) return 'Drone name is required.'
  if (!data.manufacturer.trim()) return 'Manufacturer is required.'
  if (!data.model.trim()) return 'Model is required.'
  if (!data.droneType) return 'Drone type is required.'
  return null
}

function validateRegistration(data: DroneRegistrationData, existingSerials: string[], existingRegNums: string[]): string | null {
  if (!data.serialNumber.trim()) return 'Serial number is required.'
  if (existingSerials.includes(data.serialNumber.trim())) return 'This serial number is already registered.'
  if (data.registrationNumber && existingRegNums.includes(data.registrationNumber.trim())) {
    return 'This registration number is already in use.'
  }
  if (!data.dateAcquired) return 'Date acquired is required.'
  return null
}

export function CommandStaffDroneRegistrationPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { drones, registerDrone } = useCommandStaffData()
  const { users } = useUserStore()

  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<DroneRegistrationData>(EMPTY_REGISTRATION_DATA)
  const [stepError, setStepError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registeredDrone, setRegisteredDrone] = useState<{ id: string; name: string } | null>(null)

  const existingSerialNumbers = drones.map((d) => d.serialNumber)
  const existingRegistrationNumbers = drones.filter((d) => d.registrationNumber).map((d) => d.registrationNumber!)
  const availableOperators = users.filter((u) => u.role === 'COMMAND_STAFF' && u.accountStatus === 'ACTIVE')

  function goToNextStep() {
    let error: string | null = null

    if (currentStep === 0) {
      error = validateDroneInfo(formData)
    } else if (currentStep === 1) {
      error = validateRegistration(formData, existingSerialNumbers, existingRegistrationNumbers)
    }

    if (error) {
      setStepError(error)
      return
    }

    setStepError(null)
    setCurrentStep((step) => step + 1)
  }

  function goToPreviousStep() {
    setStepError(null)
    setCurrentStep((step) => Math.max(0, step - 1))
  }

  async function handleSubmit() {
    setStepError(null)
    setIsSubmitting(true)

    await new Promise((resolve) => setTimeout(resolve, 600))

    try {
      registerDrone(formData)
      setRegisteredDrone({ id: formData.serialNumber, name: formData.name })
    } catch (error) {
      setStepError('Failed to register drone. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleBackToDrones() {
    navigate(ROUTES.commandStaffMedia)
  }

  if (!session) return null

  return (
    <>
      <PageHeader
        title="Register New Drone"
        description="Add a drone to your agency with comprehensive operational details"
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal className="mx-auto w-full max-w-2xl">
          {registeredDrone ? (
            <Card className="flex flex-col items-center gap-3 py-8 px-6 text-center motion-safe:animate-pop-in">
              <span className="flex size-14 items-center justify-center rounded-full bg-success-bg text-success-fg">
                <CheckCircle2 className="size-8" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Drone Registered Successfully</h2>
                <p className="text-sm text-foreground-secondary mt-1">{registeredDrone.name}</p>
                <p className="text-xs text-foreground-muted mt-3">
                  The drone is now ready for connection and operational use.
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full pt-4">
                <Button variant="primary" onClick={handleBackToDrones} className="w-full">
                  Back to Drones & Media
                </Button>
              </div>
            </Card>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.commandStaffMedia)} className="p-0">
                  <ArrowLeft className="size-4" />
                </Button>
              </div>

              <div className="mb-6">
                <RegistrationStepper currentStep={currentStep} steps={STEP_LABELS} />
              </div>

              <Card className="px-6 py-6">
                <div className="mb-6">
                  {currentStep === 0 && (
                    <DroneInfoStep data={formData} onChange={(patch) => setFormData({ ...formData, ...patch })} />
                  )}
                  {currentStep === 1 && (
                    <RegistrationDetailsStep
                      data={formData}
                      onChange={(patch) => setFormData({ ...formData, ...patch })}
                      existingSerialNumbers={existingSerialNumbers}
                      existingRegistrationNumbers={existingRegistrationNumbers}
                    />
                  )}
                  {currentStep === 2 && (
                    <AssignmentStep
                      data={formData}
                      onChange={(patch) => setFormData({ ...formData, ...patch })}
                      availableOperators={availableOperators}
                    />
                  )}
                  {currentStep === 3 && <ReviewStep data={formData} availableOperators={availableOperators} />}
                </div>

                {stepError && (
                  <div className="mb-4 rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger-fg" role="alert">
                    {stepError}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={goToPreviousStep}
                    disabled={currentStep === 0 || isSubmitting}
                    className="flex-1"
                  >
                    Previous
                  </Button>

                  {currentStep === 3 ? (
                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        'Register Drone'
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={goToNextStep}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      Next
                    </Button>
                  )}
                </div>
              </Card>
            </>
          )}
        </Reveal>
      </div>
    </>
  )
}
