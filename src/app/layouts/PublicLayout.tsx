import { Outlet } from 'react-router-dom'
import { PageTransition } from '../../data/components/layout/PageTransition'

/** Fades/slides each public route's content in on navigation — landing, login, unauthorized. */
export function PublicLayout() {
  return (
    <PageTransition>
      <Outlet />
    </PageTransition>
  )
}
