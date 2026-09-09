import { useEffect, useState } from 'react'
import { Check, Copy, Radio, Wifi } from 'lucide-react'
import { Modal, Button } from '../ui'
import { usePublishTarget } from '../../../features/media/useFeeds'

export interface ConnectDroneModalProps {
  open: boolean
  onClose: () => void
  onConnect: (source: string, label: string) => void
  connecting: boolean
  error: string | null
}

type Mode = 'push' | 'url'

/**
 * Connects a live aircraft, by whichever direction its video travels.
 *
 * Two modes, because drones split cleanly in two. An IP camera or enterprise
 * airframe *serves* a stream and we fetch it — that is just a URL. Every
 * consumer DJI serves nothing: the phone app pushes outward to an address you
 * give it, so the API has to listen and the operator needs to be told what to
 * type into DJI Fly. Presenting only the URL box would leave the second group
 * with a field they cannot fill in.
 */
export function ConnectDroneModal({
  open,
  onClose,
  onConnect,
  connecting,
  error,
}: ConnectDroneModalProps) {
  const [mode, setMode] = useState<Mode>('push')
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const target = usePublishTarget(open && mode === 'push')

  useEffect(() => {
    if (!open) {
      setUrl('')
      setLabel('')
      setCopied(null)
    }
  }, [open])

  function copy(value: string) {
    void navigator.clipboard?.writeText(value)
    setCopied(value)
    window.setTimeout(() => setCopied(null), 1500)
  }

  function handleConnect() {
    const source = mode === 'push' ? target.data?.listenSource ?? '' : url.trim()
    if (!source) return
    onConnect(source, label.trim() || (mode === 'push' ? 'DJI drone' : 'Live feed'))
  }

  const publishUrls = target.data?.publishUrls ?? []
  const canConnect = mode === 'push' ? Boolean(target.data?.listenSource) : url.trim().length > 0

  return (
    <Modal open={open} onClose={connecting ? () => {} : onClose} title="Connect Drone">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('push')}
            className={`flex flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left transition ${
              mode === 'push'
                ? 'border-accent bg-accent/10'
                : 'border-border bg-surface hover:bg-surface-secondary'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wifi className="size-4" /> DJI / phone app
            </span>
            <span className="text-xs text-foreground-muted">
              The drone app streams to us
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left transition ${
              mode === 'url'
                ? 'border-accent bg-accent/10'
                : 'border-border bg-surface hover:bg-surface-secondary'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Radio className="size-4" /> Stream URL
            </span>
            <span className="text-xs text-foreground-muted">
              RTSP / RTMP / HTTP source
            </span>
          </button>
        </div>

        {mode === 'push' ? (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-secondary p-3">
            <p className="text-xs text-foreground-secondary">
              In <strong>DJI Fly → Transmission → Live Streaming Platforms → RTMP</strong>, enter
              this address, then press Connect here and start the stream.
            </p>
            {target.isLoading ? (
              <p className="text-sm text-foreground-muted">Finding this computer's address…</p>
            ) : publishUrls.length === 0 ? (
              <p className="text-sm text-danger-fg">
                No network address found — connect this computer to the same Wi-Fi as the phone.
              </p>
            ) : (
              publishUrls.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => copy(u)}
                  className="flex items-center gap-2 rounded border border-border bg-surface px-2.5 py-1.5 text-left font-mono text-xs text-foreground hover:bg-surface-secondary"
                >
                  <span className="flex-1 truncate">{u}</span>
                  {copied === u ? (
                    <Check className="size-3.5 shrink-0 text-success-fg" />
                  ) : (
                    <Copy className="size-3.5 shrink-0 text-foreground-muted" />
                  )}
                </button>
              ))
            )}
            <p className="text-xs text-foreground-muted">
              The phone must reach this computer — same Wi-Fi, and if the phone is joined to the
              drone's own hotspot, use a controller so its Wi-Fi stays free.
            </p>
          </div>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
              Stream URL
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="rtsp://192.168.1.10:554/live"
              className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground"
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
            Feed name (optional)
          </span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={mode === 'push' ? 'DJI Neo 2' : 'Live feed'}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </label>

        {error ? (
          <p className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={connecting}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={!canConnect || connecting}>
            {connecting ? 'Connecting…' : 'Connect'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
