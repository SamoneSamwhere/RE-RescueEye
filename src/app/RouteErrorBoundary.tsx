import { useRouteError, isRouteErrorResponse, useNavigate, Link } from 'react-router-dom'
import { AlertTriangle, RotateCw, Home } from 'lucide-react'
import { Button } from '../components/ui'
import { ROUTES } from '../routes/paths'

function describe(error: unknown): { title: string; detail: string } {
  if (isRouteErrorResponse(error)) {
    return {
      title: error.status === 404 ? 'Page not found' : `Request failed (${error.status})`,
      detail: error.statusText || 'The page could not be loaded.',
    }
  }
  if (error instanceof Error) {
    return { title: 'Something went wrong', detail: error.message }
  }
  return { title: 'Something went wrong', detail: 'An unexpected error occurred.' }
}

/**
 * Replaces React Router's built-in error screen — the one that tells the
 * developer to supply an errorElement — so an operator who hits a crash
 * mid-incident gets a readable message and a way out rather than a stack
 * trace and a dead end.
 *
 * Mounted on the root route, so it covers every page beneath it: an error
 * thrown anywhere in the tree lands here instead of unmounting the app.
 */
export function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()
  const { title, detail } = describe(error)

  // The operational consoles are the app's whole surface; there is no
  // meaningful partial state to preserve after a render crash, so the recovery
  // is a genuine reload rather than a re-render of the same broken tree.
  const reload = () => window.location.reload()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-md border border-border bg-surface p-6 shadow-panel">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-foreground-secondary">
              The screen failed to render. Your signed-in session has not been lost.
            </p>
          </div>
        </div>

        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-surface-secondary px-3 py-2 text-xs text-foreground-secondary">
          {detail}
        </pre>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={reload}>
            <RotateCw className="size-4" />
            Reload
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Link
            to={ROUTES.login}
            className="ml-auto flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground"
          >
            <Home className="size-4" />
            Sign in again
          </Link>
        </div>
      </div>
    </div>
  )
}
