import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { CheckCircle2, ShieldAlert } from 'lucide-react'
import { useAuth, ROLE_HOME_ROUTE } from '../features/auth'
import { Card, CardContent, CardHeader, CardTitle, Button } from '../components/ui'
import { AuthPageShell, Reveal } from '../components/landing'
import {
  RegistrationStepper,
  AgencyInfoStep,
  AdminInfoStep,
  DocumentsStep,
  REQUIRED_DOCUMENTS,
} from '../components/landing/registration'
import type {
  AgencyInfoValues,
  AdminInfoValues,
  DocumentFiles,
  DocumentErrors,
  DocumentId,
} from '../components/landing/registration'
import { ROUTES } from '../routes/paths'

const STEP_LABELS = ['Agency', 'Admin', 'Documents']

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateAgencyStep(values: AgencyInfoValues): string | null {
  if (
    !values.agencyName.trim() ||
    !values.agencyType ||
    !values.agencyAddress.trim() ||
    !values.agencyPhone.trim() ||
    !values.agencyEmail.trim()
  ) {
    return 'Please fill in all required agency fields.'
  }
  if (!EMAIL_PATTERN.test(values.agencyEmail)) {
    return 'Enter a valid official email address.'
  }
  return null
}

function validateAdminStep(values: AdminInfoValues): string | null {
  if (
    !values.fullName.trim() ||
    !values.position.trim() ||
    !values.email.trim() ||
    !values.phone.trim() ||
    !values.password ||
    !values.confirmPassword
  ) {
    return 'Please fill in all required admin fields.'
  }
  if (!EMAIL_PATTERN.test(values.email)) {
    return 'Enter a valid email address.'
  }
  if (values.password.length < 8) {
    return 'Password must be at least 8 characters.'
  }
  if (values.password !== values.confirmPassword) {
    return 'Passwords do not match.'
  }
  return null
}

function validateDocumentsStep(
  files: DocumentFiles,
  errors: DocumentErrors,
  agreedToTerms: boolean,
): string | null {
  const missing = REQUIRED_DOCUMENTS.filter((doc) => doc.required && !files[doc.id])
  if (missing.length > 0) {
    return `Please upload: ${missing.map((doc) => doc.label).join(', ')}.`
  }
  if (Object.values(errors).some(Boolean)) {
    return 'Resolve the file errors above before continuing.'
  }
  if (!agreedToTerms) {
    return 'You must agree to the Terms of Service to continue.'
  }
  return null
}

export function SignUpPage() {
  const { session } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)

  const [agency, setAgency] = useState<AgencyInfoValues>({
    agencyName: '',
    agencyType: '',
    agencyAddress: '',
    agencyPhone: '',
    agencyEmail: '',
    agencyWebsite: '',
  })
  const [admin, setAdmin] = useState<AdminInfoValues>({
    fullName: '',
    position: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [documents, setDocuments] = useState<DocumentFiles>({
    registration: null,
    adminId: null,
    proofOfAddress: null,
    accreditation: null,
  })
  const [documentErrors, setDocumentErrors] = useState<DocumentErrors>({
    registration: null,
    adminId: null,
    proofOfAddress: null,
    accreditation: null,
  })
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  if (session) {
    return <Navigate to={ROLE_HOME_ROUTE[session.role]} replace />
  }

  function handleDocumentChange(id: DocumentId, file: File | null, docError: string | null) {
    setDocuments((prev) => ({ ...prev, [id]: file }))
    setDocumentErrors((prev) => ({ ...prev, [id]: docError }))
  }

  function goToNextStep() {
    const stepError = currentStep === 0 ? validateAgencyStep(agency) : validateAdminStep(admin)
    if (stepError) {
      setError(stepError)
      return
    }
    setError(null)
    setCurrentStep((step) => step + 1)
  }

  function goToPreviousStep() {
    setError(null)
    setCurrentStep((step) => Math.max(0, step - 1))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const stepError = validateDocumentsStep(documents, documentErrors, agreedToTerms)
    if (stepError) {
      setError(stepError)
      return
    }
    setError(null)
    setSubmitted(true)
  }

  return (
    <AuthPageShell>
      <Reveal className="w-full max-w-lg">
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <ShieldAlert className="size-8 text-accent" />
          <h1 className="text-xl font-semibold tracking-tight text-foreground-inverse">Register Your Agency</h1>
        </div>

        <Card className="shadow-modal">
          {submitted ? (
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="size-10 text-success" />
              <h2 className="text-base font-semibold text-foreground">Registration submitted</h2>
              <p className="text-sm leading-relaxed text-foreground-secondary">
                {agency.agencyName.trim() || 'Your agency'} has been submitted for review. A System Admin
                will verify your documents and approve or reject the registration. This is a demo build, so
                nothing was actually uploaded or stored — use one of the demo accounts on the login page to
                explore RescueEye.
              </p>
              <Link to={ROUTES.login} className="mt-2 w-full">
                <Button className="w-full">Go to login</Button>
              </Link>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle>{STEP_LABELS[currentStep]} Information</CardTitle>
              </CardHeader>
              <CardContent>
                <RegistrationStepper steps={STEP_LABELS} currentStep={currentStep} />

                <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                  <div key={currentStep} className="motion-safe:animate-step-in">
                    {currentStep === 0 ? (
                      <AgencyInfoStep
                        values={agency}
                        onChange={(patch) => setAgency((prev) => ({ ...prev, ...patch }))}
                      />
                    ) : null}
                    {currentStep === 1 ? (
                      <AdminInfoStep
                        values={admin}
                        onChange={(patch) => setAdmin((prev) => ({ ...prev, ...patch }))}
                      />
                    ) : null}
                    {currentStep === 2 ? (
                      <DocumentsStep
                        files={documents}
                        errors={documentErrors}
                        onDocumentChange={handleDocumentChange}
                        agreedToTerms={agreedToTerms}
                        onTermsChange={setAgreedToTerms}
                      />
                    ) : null}
                  </div>

                  {error ? (
                    <p
                      role="alert"
                      className="rounded-md border border-danger-border bg-danger-bg px-2 py-2 text-sm text-danger-fg motion-safe:animate-shake"
                    >
                      {error}
                    </p>
                  ) : null}

                  <div className="flex items-center gap-3">
                    {currentStep > 0 ? (
                      <Button type="button" variant="outline" onClick={goToPreviousStep} className="flex-1">
                        Back
                      </Button>
                    ) : null}
                    {currentStep < STEP_LABELS.length - 1 ? (
                      <Button type="button" onClick={goToNextStep} className="flex-1">
                        Continue
                      </Button>
                    ) : (
                      <Button type="submit" className="flex-1">
                        Submit Registration
                      </Button>
                    )}
                  </div>
                </form>

                <p className="mt-4 text-center text-sm text-foreground-secondary">
                  Already have an account?{' '}
                  <Link to={ROUTES.login} className="font-medium text-accent hover:underline">
                    Log in
                  </Link>
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </Reveal>
    </AuthPageShell>
  )
}
