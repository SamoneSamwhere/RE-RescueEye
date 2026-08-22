import { DocumentUploadField } from './DocumentUploadField'
import { REQUIRED_DOCUMENTS } from './types'
import type { DocumentErrors, DocumentFiles, DocumentId } from './types'

interface DocumentsStepProps {
  files: DocumentFiles
  errors: DocumentErrors
  onDocumentChange: (id: DocumentId, file: File | null, error: string | null) => void
  agreedToTerms: boolean
  onTermsChange: (checked: boolean) => void
}

export function DocumentsStep({
  files,
  errors,
  onDocumentChange,
  agreedToTerms,
  onTermsChange,
}: DocumentsStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-accent-border bg-accent-subtle px-3 py-2.5">
        <p className="text-xs font-medium text-accent">Document verification</p>
        <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">
          Upload the documents below so a System Admin can verify your agency&apos;s legitimacy before your
          registration is approved.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {REQUIRED_DOCUMENTS.map((doc) => (
          <DocumentUploadField
            key={doc.id}
            id={`doc-${doc.id}`}
            label={doc.label}
            hint={doc.hint}
            required={doc.required}
            file={files[doc.id]}
            error={errors[doc.id]}
            onChange={(file, error) => onDocumentChange(doc.id, file, error)}
          />
        ))}
      </div>

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
