import type { UserRole } from '../../types/user'
import { ROUTES } from '../../routes/paths'

/** Where each role lands after login / at "/". */
export const ROLE_HOME_ROUTE: Record<UserRole, string> = {
  SYSTEM_ADMIN: ROUTES.systemAdmin,
  AGENCY_ADMIN: ROUTES.agencyAdmin,
  COMMAND_STAFF: ROUTES.commandStaff,
  FIELD_RESPONDER: ROUTES.fieldResponder,
}
