import { DocumentUploadField } from './DocumentUploadField'
import { DOCUMENT_CATALOGUE, documentsFor } from './types'
import type { DocumentErrors, DocumentFiles, DocumentId, OrganizationCategory } from './types'

interface DocumentsStepProps {
  category: OrganizationCategory
  files: DocumentFiles
  errors: DocumentErrors
  onDocumentChange: (id: DocumentId, file: File | null, error: string | null) => void
  agreedToTerms: boolean
  onTermsChange: (checked: boolean) => void
}

const INTRO: Record<OrganizationCategory, string> = {
  government:
    'Government offices are not SEC-registered, so we ask for proof that you are authorized to act for your office instead.',
  registered:
    'Upload your certificate of registration so a System Admin can confirm your organization is legally registered.',
  volunteer:
    'Volunteer groups do not need to be registered. Upload your ID and at least one supporting document you already have — any of the ones below.',
}

export function DocumentsStep({
  category,
  files,
  errors,
  onDocumentChange,
  agreedToTerms,
  onTermsChange,
}: DocumentsStepProps) {
  const docs = documentsFor(category)
  const required = docs.filter((d) => d.requirement === 'required')
  const oneOf = docs.filter((d) => d.requirement === 'oneOf')
  const optional = docs.filter((d) => d.requirement === 'optional')

  const renderField = (id: DocumentId, isRequired: boolean) => (
    <DocumentUploadField
      key={id}
      id={`doc-${id}`}
      label={DOCUMENT_CATALOGUE[id].label}
      hint={DOCUMENT_CATALOGUE[id].hint}
      required={isRequired}
      file={files[id]}
      error={errors[id]}
      onChange={(file, error) => onDocumentChange(id, file, error)}
    />
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-accent-border bg-accent-subtle px-3 py-2.5">
        <p className="text-xs font-medium text-accent">Document verification</p>
        <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">{INTRO[category]}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {required.map((d) => renderField(d.id, true))}
      </div>

      {oneOf.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
            Supporting documents <span className="text-danger">*</span>
            <span className="ml-1 normal-case text-foreground-muted">— at least one</span>
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Shown as optional one by one: no single one of these is required. */}
            {oneOf.map((d) => renderField(d.id, false))}
          </div>
        </div>
      ) : null}

      {optional.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{optional.map((d) => renderField(d.id, false))}</div>
      ) : null}

      <label htmlFor="terms" className="flex items-start gap-2 text-xs text-foreground-secondary">
        <input
          id="terms"
          type="checkbox"
          checked={agreedToTerms}
          onChange={(event) => onTermsChange(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 rounded border-border-strong [accent-color:var(--color-accent)]"
        />
        <span>
          I certify that the information and documents provided are accurate, and I agree to the{' '}
          <a href="#" className="font-medium text-accent hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="font-medium text-accent hover:underline">
            Privacy Policy
          </a>
          .
        </span>
      </label>
    </div>
  )
}
