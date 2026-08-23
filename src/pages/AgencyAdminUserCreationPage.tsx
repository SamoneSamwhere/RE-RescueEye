import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { RegistrationStepper } from '../components/landing/registration'
import {
  PersonnelInfoStep,
  RoleStep,
  AccountDetailsStep,
  ReviewStep,
  ROLE_OPTIONS,
} from '../components/agency-admin/user-creation'
import type { PersonnelInfoValues, AccountValues } from '../components/agency-admin/user-creation'
import { Card, Button } from '../components/ui'
import { useAuth } from '../features/auth'
import { useAgencyAdminData } from '../features/agency-admin'
import type { CreatableUserRole } from '../features/agency-admin'
import { ROUTES } from '../routes/paths'
import { cn } from '../lib/cn'

const STEP_LABELS = ['Personnel', 'Role', 'Account', 'Review']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validatePersonnelStep(values: PersonnelInfoValues): string | null {
  if (!values.fullName.trim() || !values.email.trim() || !values.phone.trim()) {
    return 'Please fill in all personnel fields.'
  }
  if (!EMAIL_PATTERN.test(values.email)) {
    return 'Enter a valid email address.'
  }
  return null
}

function validateRoleStep(role: CreatableUserRole | null): string | null {
  if (!role) return 'Select a role to continue.'
  return null
}

function validateAccountStep(values: AccountValues): string | null {
  if (!values.password || !values.confirmPassword) {
    return 'Please set and confirm a password.'
  }
  if (values.password.length < 8) {
    return 'Password must be at least 8 characters.'
  }
  if (values.password !== values.confirmPassword) {
    return 'Passwords do not match.'
  }
  return null
}

const EMPTY_PERSONNEL: PersonnelInfoValues = { fullName: '', email: '', phone: '' }
const EMPTY_ACCOUNT: AccountValues = { password: '', confirmPassword: '' }

export function AgencyAdminUserCreationPage() {
  const { session } = useAuth()
  const { createUser } = useAgencyAdminData()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(0)
  const [personnel, setPersonnel] = useState<PersonnelInfoValues>(EMPTY_PERSONNEL)
  const [role, setRole] = useState<CreatableUserRole | null>(null)
  const [account, setAccount] = useState<AccountValues>(EMPTY_ACCOUNT)
  const [stepError, setStepError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdUser, setCreatedUser] = useState<{ id: string; name: string; role: CreatableUserRole } | null>(null)

  const agencyName = session?.agencyName ?? 'your agency'

  function goToNextStep() {
    const stepErrorMessage =
      currentStep === 0
        ? validatePersonnelStep(personnel)
        : currentStep === 1
          ? validateRoleStep(role)
          : validateAccountStep(account)
    if (stepErrorMessage) {
      setStepError(stepErrorMessage)
      return
    }
    setStepError(null)
    setCurrentStep((step) => step + 1)
  }

  function goToPreviousStep() {
    setStepError(null)
    setCurrentStep((step) => Math.max(0, step - 1))
  }

  function resetWizard() {
    setCurrentStep(0)
    setPersonnel(EMPTY_PERSONNEL)
    setRole(null)
    setAccount(EMPTY_ACCOUNT)
    setStepError(null)
    setCreatedUser(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!role) return
    setStepError(null)
    setIsSubmitting(true)
    // Brief simulated latency so the loading state is actually visible — this is a mock backend with no real network call.
    await new Promise((resolve) => setTimeout(resolve, 600))

    const result = createUser({
      name: personnel.fullName,
      email: personnel.email,
      phone: personnel.phone,
      password: account.password,
      role,
    })
    setIsSubmitting(false)

    if (!result.ok) {
      setStepError(result.error)
      return
    }
    setCreatedUser({ id: result.userId, name: personnel.fullName.trim(), role })
  }

  function handleViewUser() {
    if (!createdUser) return
    navigate(ROUTES.agencyAdminAccountStatus, { state: { highlightUserId: createdUser.id } })
  }

  function handleBackToPersonnel() {
    navigate(ROUTES.agencyAdminAccountStatus)
  }

  const roleLabel = createdUser ? ROLE_OPTIONS.find((option) => option.role === createdUser.role)?.title : null

  return (
    <>
      <PageHeader
        title="Create Personnel"
        description="Add a Command Staff or Field Responder account to your agency."
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal className="mx-auto w-full max-w-2xl">
          <Card className="px-6 py-6">
            {createdUser ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center motion-safe:animate-pop-in">
                <span className="flex size-14 items-center justify-center rounded-full bg-success-bg text-success-fg">
                  <CheckCircle2 className="size-8" />
                </span>
                <h2 className="text-lg font-semibold text-foreground">User Created Successfully</h2>
                <p className="max-w-sm text-sm leading-relaxed text-foreground-secondary">
                  <strong className="text-foreground">{createdUser.name}</strong> has been added to{' '}
                  <strong className="text-foreground">{agencyName}</strong> as{' '}
                  <strong className="text-foreground">{roleLabel}</strong>.
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <Button onClick={handleViewUser}>View User</Button>
                  <Button variant="secondary" onClick={resetWizard}>
                    Create Another User
                  </Button>
                  <Button variant="outline" onClick={handleBackToPersonnel}>
                    Back to Personnel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <RegistrationStepper steps={STEP_LABELS} currentStep={currentStep} />

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div key={currentStep} className="motion-safe:animate-step-in">
                    {currentStep === 0 ? (
                      <PersonnelInfoStep
                        values={personnel}
                        onChange={(patch) => setPersonnel((prev) => ({ ...prev, ...patch }))}
                      />
                    ) : null}
                    {currentStep === 1 ? <RoleStep selectedRole={role} onSelect={setRole} /> : null}
                    {currentStep === 2 ? (
                      <AccountDetailsStep
                        values={account}
                        onChange={(patch) => setAccount((prev) => ({ ...prev, ...patch }))}
                      />
                    ) : null}
                    {currentStep === 3 && role ? (
                      <ReviewStep
                        fullName={personnel.fullName}
                        email={personnel.email}
                        phone={personnel.phone}
                        role={role}
                        agencyName={agencyName}
                      />
                    ) : null}
                  </div>

                  {stepError ? (
                    <p
                      role="alert"
                      className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg motion-safe:animate-shake"
                    >
                      {stepError}
                    </p>
                  ) : null}

                  <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                    {currentStep > 0 ? (
                      <Button type="button" variant="outline" onClick={goToPreviousStep} disabled={isSubmitting}>
                        Back
                      </Button>
                    ) : null}
                    {currentStep < STEP_LABELS.length - 1 ? (
                      <Button key="continue" type="button" onClick={goToNextStep}>
                        Continue
                      </Button>
                    ) : (
                      <Button
                        key="submit"
                        type="submit"
                        disabled={isSubmitting}
                        className={cn(isSubmitting && 'cursor-wait')}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            Creating User…
                          </>
                        ) : (
                          'Create User'
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </>
            )}
          </Card>
        </Reveal>
      </div>
    </>
  )
}
