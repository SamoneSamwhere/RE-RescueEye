import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { UserCreateForm } from '../components/agency-admin'
import { Card } from '../components/ui'
import { CheckCircle2, KeyRound, ShieldCheck, UsersRound } from 'lucide-react'
import { useAgencyAdminData } from '../features/agency-admin'

export function AgencyAdminUserCreationPage() {
  const { createUser } = useAgencyAdminData()

  return (
    <>
      <PageHeader
        title="User Creation"
        description="Create a Command Staff or Field Responder account for your agency."
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal className="w-full max-w-5xl">
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
            <UserCreateForm onCreate={createUser} />

            <Card className="flex flex-col gap-5 px-5 py-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
                  <UsersRound className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Account setup</h2>
                  <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">
                    Give each team member the access they need for their part in an active response.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Command Staff</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">
                      Review detections, confirm incidents, and coordinate missions from command.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <UsersRound className="mt-0.5 size-4 shrink-0 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Field Responder</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">
                      Receive assignments, update mission status, and report from the field.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-accent-border bg-accent-subtle px-3 py-3">
                <div className="flex items-center gap-2 text-xs font-medium text-accent">
                  <KeyRound className="size-3.5" />
                  Access checklist
                </div>
                <ul className="mt-2 flex flex-col gap-2 text-xs text-foreground-secondary">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    Use the member&apos;s agency email address.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    Share the temporary password securely.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    Disable access when their role changes.
                  </li>
                </ul>
              </div>
            </Card>
          </div>
        </Reveal>
      </div>
    </>
  )
}
