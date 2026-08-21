import { createBrowserRouter, Outlet } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import { SignUpPage } from '../pages/SignUpPage'
import { UnauthorizedPage } from '../pages/UnauthorizedPage'
import { SystemAdminDashboardPage } from '../pages/SystemAdminDashboardPage'
import { SystemAdminAgencyValidationPage } from '../pages/SystemAdminAgencyValidationPage'
import { SystemAdminAgencyStatusPage } from '../pages/SystemAdminAgencyStatusPage'
import { CommandStaffDashboardPage } from '../pages/CommandStaffDashboardPage'
import { CommandStaffDronesMediaPage } from '../pages/CommandStaffDronesMediaPage'
import { CommandStaffDetectionReviewPage } from '../pages/CommandStaffDetectionReviewPage'
import { CommandStaffIncidentsPage } from '../pages/CommandStaffIncidentsPage'
import { CommandStaffIncidentDetailPage } from '../pages/CommandStaffIncidentDetailPage'
import { CommandStaffMapPage } from '../pages/CommandStaffMapPage'
import { FieldResponderHomePage } from '../pages/FieldResponderHomePage'
import { FieldResponderProfilePage } from '../pages/FieldResponderProfilePage'
import { FieldResponderMissionDetailPage } from '../pages/FieldResponderMissionDetailPage'
import { AgencyAdminDashboardPage } from '../pages/AgencyAdminDashboardPage'
import { AgencyAdminUserCreationPage } from '../pages/AgencyAdminUserCreationPage'
import { AgencyAdminAccountStatusPage } from '../pages/AgencyAdminAccountStatusPage'
import { AgencyAdminMissionHistoryPage } from '../pages/AgencyAdminMissionHistoryPage'
import { ProtectedRoute, RootRedirect } from '../features/auth'
import { CommandStaffDataProvider } from '../features/command-staff'
import { FieldResponderDataProvider } from '../features/field-responder'
import { AgencyAdminDataProvider } from '../features/agency-admin'
import { SystemAdminDataProvider } from '../features/system-admin'
import { ROUTES } from '../routes/paths'
import { RootLayout } from './RootLayout'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <RootRedirect /> },
      { path: ROUTES.login, element: <LoginPage /> },
      { path: ROUTES.signup, element: <SignUpPage /> },
      { path: ROUTES.unauthorized, element: <UnauthorizedPage /> },
      {
        element: (
          <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}>
            <SystemAdminDataProvider>
              <Outlet />
            </SystemAdminDataProvider>
          </ProtectedRoute>
        ),
        children: [
          { path: ROUTES.systemAdmin, element: <SystemAdminDashboardPage /> },
          { path: ROUTES.systemAdminAgencyValidation, element: <SystemAdminAgencyValidationPage /> },
          { path: ROUTES.systemAdminAgencyStatus, element: <SystemAdminAgencyStatusPage /> },
        ],
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['AGENCY_ADMIN']}>
            <AgencyAdminDataProvider>
              <Outlet />
            </AgencyAdminDataProvider>
          </ProtectedRoute>
        ),
        children: [
          { path: ROUTES.agencyAdmin, element: <AgencyAdminDashboardPage /> },
          { path: ROUTES.agencyAdminUserCreation, element: <AgencyAdminUserCreationPage /> },
          { path: ROUTES.agencyAdminAccountStatus, element: <AgencyAdminAccountStatusPage /> },
          { path: ROUTES.agencyAdminMissionHistory, element: <AgencyAdminMissionHistoryPage /> },
        ],
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['COMMAND_STAFF']}>
            <CommandStaffDataProvider>
              <Outlet />
            </CommandStaffDataProvider>
          </ProtectedRoute>
        ),
        children: [
          { path: ROUTES.commandStaff, element: <CommandStaffDashboardPage /> },
          { path: ROUTES.commandStaffMedia, element: <CommandStaffDronesMediaPage /> },
          { path: ROUTES.commandStaffDetections, element: <CommandStaffDetectionReviewPage /> },
          { path: ROUTES.commandStaffIncidents, element: <CommandStaffIncidentsPage /> },
          { path: ROUTES.commandStaffIncidentDetail, element: <CommandStaffIncidentDetailPage /> },
          { path: ROUTES.commandStaffMap, element: <CommandStaffMapPage /> },
        ],
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['FIELD_RESPONDER']}>
            <FieldResponderDataProvider>
              <Outlet />
            </FieldResponderDataProvider>
          </ProtectedRoute>
        ),
        children: [
          { path: ROUTES.fieldResponder, element: <FieldResponderHomePage /> },
          { path: ROUTES.fieldResponderProfile, element: <FieldResponderProfilePage /> },
          { path: ROUTES.fieldResponderMissionDetail, element: <FieldResponderMissionDetailPage /> },
        ],
      },
    ],
  },
])
