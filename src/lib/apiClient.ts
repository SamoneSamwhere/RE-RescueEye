/**
 * Thin client for the RescueEye detection API (FastAPI, separate origin).
 *
 * This is the app's first real network dependency — every other data source is
 * still a mock store under src/data. Keep it small and unopinionated: callers
 * own their own types, this only handles the base URL, JSON decoding and
 * turning a non-2xx into a useful Error.
 */

/** Base URL of the Python API. Override with VITE_API_BASE_URL in .env. */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:8000'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Pulls FastAPI's `detail` out of an error body, falling back to the status text. */
async function toApiError(response: Response): Promise<ApiError> {
  let detail = response.statusText || `Request failed (${response.status})`
  try {
    const body = await response.json()
    if (typeof body?.detail === 'string') detail = body.detail
    else if (Array.isArray(body?.detail) && body.detail[0]?.msg) detail = body.detail[0].msg
  } catch {
    // Body wasn't JSON — the status text is the best we have.
  }
  return new ApiError(detail, response.status)
}

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(apiUrl(path), init)
  } catch {
    // fetch only rejects on network-level failure, which for this app almost
    // always means the Python service isn't running.
    throw new ApiError(`Cannot reach the detection API at ${API_BASE_URL}. Is it running?`, 0)
  }
  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

/**
 * Multipart upload with progress. Uses XMLHttpRequest rather than fetch because
 * fetch still has no upload-progress event, and a drone clip is large enough
 * that a progress bar is the difference between "working" and "frozen".
 */
export function uploadWithProgress<T>(
  path: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): { promise: Promise<T>; abort: () => void } {
  const xhr = new XMLHttpRequest()
  const promise = new Promise<T>((resolve, reject) => {
    xhr.open('POST', apiUrl(path))
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T)
        } catch {
          reject(new ApiError('API returned a malformed response.', xhr.status))
        }
        return
      }
      let detail = `Upload failed (${xhr.status})`
      try {
        const parsed = JSON.parse(xhr.responseText)
        if (typeof parsed?.detail === 'string') detail = parsed.detail
      } catch {
        // keep the status-based message
      }
      reject(new ApiError(detail, xhr.status))
    })
    xhr.addEventListener('error', () =>
      reject(new ApiError(`Cannot reach the detection API at ${API_BASE_URL}. Is it running?`, 0)),
    )
    xhr.addEventListener('abort', () => reject(new ApiError('Upload cancelled.', 0)))
    xhr.send(formData)
  })
  return { promise, abort: () => xhr.abort() }
}
