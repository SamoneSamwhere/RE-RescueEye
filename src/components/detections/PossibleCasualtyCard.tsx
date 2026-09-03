import { useState } from 'react'
import { AlertTriangle, Check, ImageOff, ShieldCheck } from 'lucide-react'
import { Button, Badge } from '../ui'
import { formatDateTime } from '../../lib/formatDateTime'
import type { Detection } from '../../types/detection'

export interface PossibleCasualtyCardProps {
  detection: Detection
  /** Verifying opens an Incident, so it needs a priority — MEDIUM unless changed in the full panel. */
  onVerify: (detectionId: string) => void
  verifying?: boolean
}

/**
 * Compact "is this a casualty?" card: the crop the model actually saw, plus a
 * one-click Verify.
 *
 * The image matters more than the number. A confidence score alone gives a
 * commander no way to tell a person from a grass tuft, and this model does
 * produce both — so the decision to send responders should be made against a
 * picture, not a percentage.
 */
export function PossibleCasualtyCard({ detection, onVerify, verifying = false }: PossibleCasualtyCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const percent = Math.round(detection.confidence * 100)
  const isVerified = detection.validationStatus === 'VERIFIED'

  return (
    <div className="flex gap-3 rounded-md border border-accent-border bg-accent-subtle p-3">
      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded border border-border bg-surface-inverse">
        {detection.snapshotUrl && !imageFailed ? (
          <img
            src={detection.snapshotUrl}
            alt={`Possible casualty detected at ${formatDateTime(detection.detectedAt)}`}
            className="h-full w-full object-cover"
            // The crop lives in a bounded buffer on the API, so an older
            // detection legitimately has no image left to serve.
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-foreground-inverse/40">
            <ImageOff className="size-5" />
            <span className="text-[10px]">No frame kept</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <AlertTriangle className="size-3.5 shrink-0 text-accent" />
            Possible casualty
            <Badge tone={percent >= 80 ? 'danger' : 'warning'}>{percent}%</Badge>
          </p>
          <p className="mt-0.5 truncate text-xs text-foreground-muted">
            {formatDateTime(detection.detectedAt)} · {detection.location.lat.toFixed(5)},{' '}
            {detection.location.lng.toFixed(5)}
          </p>
        </div>

        {isVerified ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-success">
            <ShieldCheck className="size-3.5" />
            Verified — now on the Damage Map
          </span>
        ) : (
          <div>
            <Button size="sm" disabled={verifying} onClick={() => onVerify(detection.id)}>
              <Check className="size-3.5" />
              {verifying ? 'Verifying…' : 'Verify casualty'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
