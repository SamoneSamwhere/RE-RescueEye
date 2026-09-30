import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useAuth, ROLE_HOME_ROUTE } from '../features/auth'
import { Field, Input, Button } from '../data/components/ui'
import { AuthPageShell, Reveal } from '../data/components/landing'
import {
  RegistrationStepper,
  AgencyInfoStep,
  AdminInfoStep,
  DocumentsStep,
  DOCUMENT_CATALOGUE,
  OTHER_POSITION,
  categoryForType,
  documentsFor,
  emptyDocumentRecord,
  formatAddress,
  resolvedPosition,
} from '../data/components/landing/registration'
import type {
  AgencyInfoValues,
  AdminInfoValues,
  DocumentFiles,
  DocumentErrors,
  DocumentId,
  OrganizationCategory,
} from '../data/components/landing/registration'
import { useAgencyStore } from '../state/AgencyStore'
import { useAgencyDatabase } from '../hooks/useAgencyDatabase'
import { now } from '../lib/now'
import { formatPhPhone, parsePhPhone } from '../lib/phone'
import { cn } from '../lib/cn'

type AuthMode = 'signin' | 'signup'

const STEP_LABELS = ['Organization', 'Admin', 'Documents']

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Letters (any script, so ñ and accented names pass), spaces, hyphens, apostrophes and periods. */
const NAME_PATTERN = /^[\p{L}][\p{L}\s.'-]*$/u
/** Philippine ZIP codes are four digits. */
const ZIP_PATTERN = /^\d{4}$/
/** A barangay or city name: letters, digits (e.g. "Barangay 176"), and common punctuation. */
const PLACE_PATTERN = /^[\p{L}\d][\p{L}\d\s.,'()-]*$/u

function validateAgencyStep(values: AgencyInfoValues): string | null {
  if (
    !values.agencyName.trim() ||
    !values.agencyType ||
    !values.addressBarangay.trim() ||
    !values.addressCity.trim() ||
    !values.addressProvince ||
    !values.addressZip.trim() ||
    !values.agencyPhone.trim() ||
    !values.agencyEmail.trim()
  ) {
    return 'Please fill in all required organization fields.'
  }
  if (!PLACE_PATTERN.test(values.addressBarangay.trim()) || values.addressBarangay.trim().length < 2) {
    return 'Enter a valid barangay name.'
  }
  if (!PLACE_PATTERN.test(values.addressCity.trim()) || values.addressCity.trim().length < 2) {
    return 'Enter a valid city or municipality.'
  }
  if (!ZIP_PATTERN.test(values.addressZip.trim())) {
    return 'ZIP code must be 4 digits (e.g. 6000 for Cebu City).'
  }
  const orgPhone = parsePhPhone(values.agencyPhone)
  if (!orgPhone.ok) return orgPhone.error
  if (!EMAIL_PATTERN.test(values.agencyEmail)) {
    return 'Enter a valid official email address.'
  }
  return null
}

function validateAdminStep(values: AdminInfoValues): string | null {
  if (
    !values.firstName.trim() ||
    !values.middleName.trim() ||
    !values.lastName.trim() ||
    !values.position ||
    !values.email.trim() ||
    !values.phone.trim() ||
    !values.password ||
    !values.confirmPassword
  ) {
    return 'Please fill in all required admin fields, including your middle name.'
  }
  for (const [label, value] of [
    ['First name', values.firstName],
    ['Middle name', values.middleName],
    ['Last name', values.lastName],
  ] as const) {
    if (!NAME_PATTERN.test(value.trim())) return `${label} can only contain letters, spaces, hyphens, and apostrophes.`
  }
  if (values.position === OTHER_POSITION && !values.positionOther.trim()) {
    return 'Enter your position.'
  }
  if (!EMAIL_PATTERN.test(values.email)) {
    return 'Enter a valid email address.'
  }
  const adminPhone = parsePhPhone(values.phone, ['mobile'])
  if (!adminPhone.ok) return adminPhone.error
  if (values.password.length < 8) {
    return 'Password must be at least 8 characters.'
  }
  if (values.password !== values.confirmPassword) {
    return 'Passwords do not match.'
  }
  return null
}

function validateDocumentsStep(
  category: OrganizationCategory,
  files: DocumentFiles,
  errors: DocumentErrors,
  agreedToTerms: boolean,
): string | null {
  const docs = documentsFor(category)
  const missing = docs.filter((doc) => doc.requirement === 'required' && !files[doc.id])
  if (missing.length > 0) {
    return `Please upload: ${missing.map((doc) => DOCUMENT_CATALOGUE[doc.id].label).join(', ')}.`
  }
  const oneOf = docs.filter((doc) => doc.requirement === 'oneOf')
  if (oneOf.length > 0 && !oneOf.some((doc) => files[doc.id])) {
    return 'Upload at least one supporting document — any of the ones listed is enough.'
  }
  if (docs.some((doc) => errors[doc.id])) {
    return 'Resolve the file errors above before continuing.'
  }
  if (!agreedToTerms) {
    return 'You must agree to the Terms of Service to continue.'
  }
  return null
}

const MOBILE_QUERY = '(max-width: 1023px)'

export function AuthPage() {
  const { login, session } = useAuth()
  const { addAgency } = useAgencyStore()
  const { createAgency: createAgencyInDb, isLoading: isCreatingAgency } = useAgencyDatabase()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode: AuthMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const [currentStep, setCurrentStep] = useState(0)
  const [agency, setAgency] = useState<AgencyInfoValues>({
    agencyName: '',
    agencyType: '',
    addressStreet: '',
    addressBarangay: '',
    addressCity: '',
    addressProvince: '',
    addressZip: '',
    agencyPhone: '',
    agencyEmail: '',
    agencyWebsite: '',
  })
  const [admin, setAdmin] = useState<AdminInfoValues>({
    firstName: '',
    middleName: '',
    lastName: '',
    position: '',
    positionOther: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [documents, setDocuments] = useState<DocumentFiles>(() => emptyDocumentRecord<File | null>(null))
  const [documentErrors, setDocumentErrors] = useState<DocumentErrors>(() => emptyDocumentRecord<string | null>(null))
  const category = categoryForType(agency.agencyType)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    // Field responders only sign in on mobile — registration is a desktop, agency-admin flow.
    if (mode !== 'signup') return
    const mql = window.matchMedia(MOBILE_QUERY)
    if (mql.matches) switchMode('signin')
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) switchMode('signin')
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  if (session) {
    return <Navigate to={ROLE_HOME_ROUTE[session.role]} replace />
  }

  function switchMode(next: AuthMode) {
    const params = new URLSearchParams(searchParams)
    if (next === 'signup') params.set('mode', 'signup')
    else params.delete('mode')
    setSearchParams(params, { replace: true })
  }

  async function handleLoginSubmit(event: FormEvent) {
    event.preventDefault()
    setLoginError(null)
    setIsLoggingIn(true)
    const result = await login(email, password)
    setIsLoggingIn(false)
    if (!result.ok) {
      setLoginError(result.error)
    }
  }

  function handleDocumentChange(id: DocumentId, file: File | null, docError: string | null) {
    setDocuments((prev) => ({ ...prev, [id]: file }))
    setDocumentErrors((prev) => ({ ...prev, [id]: docError }))
  }

  function goToNextStep() {
    const stepError = currentStep === 0 ? validateAgencyStep(agency) : validateAdminStep(admin)
    if (stepError) {
      setSignupError(stepError)
      return
    }
    setSignupError(null)
    setCurrentStep((step) => step + 1)
  }

  function goToPreviousStep() {
    setSignupError(null)
    setCurrentStep((step) => Math.max(0, step - 1))
  }

  async function handleSignupSubmit(event: FormEvent) {
    event.preventDefault()
    const stepError = validateDocumentsStep(category, documents, documentErrors, agreedToTerms)
    if (stepError) {
      setSignupError(stepError)
      return
    }
    setSignupError(null)

    const address = formatAddress(agency)
    const position = resolvedPosition(admin)

    let result: Awaited<ReturnType<typeof createAgencyInDb>>
    try {
      result = await createAgencyInDb({
        agencyName: agency.agencyName,
        agencyType: agency.agencyType,
        agencyAddress: address,
        agencyPhone: formatPhPhone(agency.agencyPhone),
        agencyEmail: agency.agencyEmail,
        agencyWebsite: agency.agencyWebsite,
        adminFirstName: admin.firstName,
        adminMiddleName: admin.middleName,
        adminLastName: admin.lastName,
        adminPosition: position,
        adminEmail: admin.email,
        adminPhone: formatPhPhone(admin.phone, ['mobile']),
        adminPassword: admin.password,
      })
    } catch (err) {
      // createAgency reports its own failures; this catches anything it didn't
      // (a crash in password hashing, say) so the form never fails silently.
      console.error('Registration failed unexpectedly:', err)
      setSignupError('Registration could not be submitted. Please try again.')
      return
    }

    if (!result.success) {
      setSignupError(result.error || 'Failed to register your organization. Please try again.')
      // The email lives on the Admin step; land the user where they can fix it
      // instead of leaving them on Documents with nothing to change.
      if (result.field === 'adminEmail') setCurrentStep(1)
      return
    }

    // Also add to local mock store for consistency
    addAgency({
      id: `agency-${result.agencyId}`,
      name: agency.agencyName,
      agencyType: agency.agencyType,
      address,
      contactPhone: formatPhPhone(agency.agencyPhone),
      contactEmail: agency.agencyEmail,
      website: agency.agencyWebsite || undefined,
      agencyAdmin: {
        fullName: [admin.firstName, admin.middleName, admin.lastName].map((n) => n.trim()).join(' '),
        position,
        email: admin.email,
        phone: formatPhPhone(admin.phone, ['mobile']),
      },
      // The files the reviewer will look at. These were dropped before — the
      // record went out with no documents at all, so the System Admin had
      // nothing to verify against. Held as object URLs for this session.
      documents: documentsFor(category)
        .filter(({ id }) => documents[id])
        .map(({ id, requirement }) => {
          const file = documents[id] as File
          return {
            id,
            label: DOCUMENT_CATALOGUE[id].label,
            required: requirement === 'required',
            fileName: file.name,
            fileType: file.type === 'application/pdf' ? ('pdf' as const) : ('image' as const),
            url: URL.createObjectURL(file),
            uploadedAt: now().toISOString(),
          }
        }),
      registrationStatus: 'PENDING',
      accountStatus: 'INACTIVE',
      registeredAt: now().toISOString(),
    })

    setSubmitted(true)
  }

  return (
    <AuthPageShell>
      <Reveal className={cn('w-full', mode === 'signup' && currentStep === 2 ? 'max-w-6xl' : 'max-w-4xl')}>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-modal">
          <div className="flex flex-col lg:flex-row">
            {/* Sign in slot — always shown on mobile; field responders sign in with credentials their agency admin created.
                inert when the sign-up slot is active on desktop: the sliding overlay only covers it visually
                (it's pointer-events-none so its own CTA button stays clickable), so without inert its fields would
                still be reachable by click/tab underneath. */}
            <div className="w-full px-6 py-6 sm:px-10 sm:py-7 lg:w-1/2" inert={mode === 'signup' ? true : undefined}>
              <div className="max-w-md">
                <h2 className="text-center text-2xl font-semibold text-foreground">Sign In</h2>
              </div>

              <div className="mt-4 max-w-md rounded-md border border-accent-border bg-accent-subtle px-3 py-2.5">
                <p className="text-xs font-medium text-accent">Secure responder access</p>
                <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">
                  Your agency administrator provides your account and role permissions.
                </p>
              </div>

              <form className="mt-5 flex max-w-md flex-col gap-3" onSubmit={handleLoginSubmit}>
                <Field
                  label="Email"
                  htmlFor="email"
                >
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="name@agency.org"
                    className="bg-surface-secondary"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </Field>
                <Field
                  label="Password"
                  htmlFor="password"
                >
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="bg-surface-secondary"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </Field>

                {loginError ? (
                  <p
                    role="alert"
                    className="rounded-md border border-danger-border bg-danger-bg px-2 py-2 text-sm text-danger-fg"
                  >
                    {loginError}
                  </p>
                ) : null}

                <Button type="submit" className="mt-1 self-center px-8" disabled={isLoggingIn}>
                  {isLoggingIn ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </div>

            {/* Sign up slot — desktop only; agency registration is not part of the mobile field-responder app.
                inert when covered by the overlay on the signin side, for the same reason as the sign-in slot above. */}
            <div
              className="hidden w-full px-6 py-6 sm:px-10 sm:py-7 lg:block lg:w-1/2"
              inert={mode === 'signin' ? true : undefined}
            >
              {submitted ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <CheckCircle2 className="size-10 text-success" />
                  <h2 className="text-base font-semibold text-foreground">Registration submitted</h2>
                  <p className="text-sm leading-relaxed text-foreground-secondary">
                    {agency.agencyName.trim() || 'Your organization'} has been submitted for review. A System Admin
                    will verify your documents and approve or reject the registration — you can sign in once it is
                    approved.
                  </p>
                  <Button className="mt-2 w-full" onClick={() => switchMode('signin')}>
                    Go to sign in
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-center text-2xl font-semibold text-foreground">{STEP_LABELS[currentStep]} Information</h2>
                  <RegistrationStepper steps={STEP_LABELS} currentStep={currentStep} />

                  <form className="flex flex-col gap-4" onSubmit={handleSignupSubmit}>
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
                          category={category}
                          files={documents}
                          errors={documentErrors}
                          onDocumentChange={handleDocumentChange}
                          agreedToTerms={agreedToTerms}
                          onTermsChange={setAgreedToTerms}
                        />
                      ) : null}
                    </div>

                    {signupError ? (
                      <p
                        role="alert"
                        className="rounded-md border border-danger-border bg-danger-bg px-2 py-2 text-sm text-danger-fg motion-safe:animate-shake"
                      >
                        {signupError}
                      </p>
                    ) : null}

                    <div className="flex items-center justify-end gap-3">
                      {currentStep > 0 ? (
                        <Button type="button" variant="outline" onClick={goToPreviousStep} disabled={isCreatingAgency}>
                          Back
                        </Button>
                      ) : null}
                      {currentStep < STEP_LABELS.length - 1 ? (
                        <Button type="button" onClick={goToNextStep}>
                          Continue
                        </Button>
                      ) : (
                        <Button type="submit" disabled={isCreatingAgency}>
                          {isCreatingAgency ? 'Submitting...' : 'Submit Registration'}
                        </Button>
                      )}
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Sliding accent overlay — desktop only; slides between covering the inactive slot */}
          <div
            className={cn(
              'pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 flex-col items-center justify-center gap-4 overflow-hidden bg-gradient-to-br from-[#172554] via-[#0f1f46] to-[#08152f] px-10 text-center motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-in-out lg:flex',
              mode === 'signup' && 'lg:-translate-x-full',
            )}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-20 [background-image:linear-gradient(135deg,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(45deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(37,99,235,0.32),transparent_62%)]"
            />
            {mode === 'signin' ? (
              <>
                <h2 className="relative text-2xl font-semibold text-foreground-inverse">New Organization?</h2>
                <p className="relative text-sm text-foreground-inverse/80">
                  Register your organization — agency, NGO, or volunteer group — to start coordinating disaster response operations.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="pointer-events-auto relative cursor-pointer rounded-md border border-white/60 px-4 py-2 text-sm font-medium text-foreground-inverse transition-colors hover:bg-white/10"
                >
                  Register Organization
                </button>
              </>
            ) : (
              <>
                <h2 className="relative text-2xl font-semibold text-foreground-inverse">Welcome Back</h2>
                <p className="relative text-sm text-foreground-inverse/80">
                  Already registered? Sign in to access your dashboard.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="pointer-events-auto relative cursor-pointer rounded-md border border-white/60 px-4 py-2 text-sm font-medium text-foreground-inverse transition-colors hover:bg-white/10"
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </Reveal>
    </AuthPageShell>
  )
}
