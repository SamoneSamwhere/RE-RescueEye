import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AuthPage } from '../pages/AuthPage'
import { UnauthorizedPage } from '../pages/UnauthorizedPage'
import { SystemAdminDashboardPage } from '../pages/SystemAdminDashboardPage'
import { SystemAdminAgencyValidationPage } from '../pages/SystemAdminAgencyValidationPage'
import { SystemAdminAgencyValidationDetailPage } from '../pages/SystemAdminAgencyValidationDetailPage'
import { SystemAdminAgencyStatusPage } from '../pages/SystemAdminAgencyStatusPage'
import { SystemAdminSettingsPage } from '../pages/SystemAdminSettingsPage'
import { CommandStaffDashboardPage } from '../pages/CommandStaffDashboardPage'
import { CommandStaffDronesMediaPage } from '../pages/CommandStaffDronesMediaPage'
import { CommandStaffLiveMonitoringPage } from '../pages/CommandStaffLiveMonitoringPage'
import { CommandStaffDetectionReviewPage } from '../pages/CommandStaffDetectionReviewPage'
import { CommandStaffLogsPage } from '../pages/CommandStaffClassificationLogPage'
import { CommandStaffIncidentsPage } from '../pages/CommandStaffIncidentsPage'
import { CommandStaffIncidentDetailPage } from '../pages/CommandStaffIncidentDetailPage'
import { CommandStaffMapPage } from '../pages/CommandStaffMapPage'
import { CommandStaffSettingsPage } from '../pages/CommandStaffSettingsPage'
import { CommandStaffDroneRegistrationPage } from '../pages/CommandStaffDroneRegistrationPage'
import { FieldResponderHomePage } from '../pages/FieldResponderHomePage'
import { FieldResponderMapPage } from '../pages/FieldResponderMapPage'
import { FieldResponderProfilePage } from '../pages/FieldResponderProfilePage'
import { FieldResponderSettingsPage } from '../pages/FieldResponderSettingsPage'
import { FieldResponderMissionDetailPage } from '../pages/FieldResponderMissionDetailPage'
import { AgencyAdminDashboardPage } from '../pages/AgencyAdminDashboardPage'
import { AgencyAdminUserCreationPage } from '../pages/AgencyAdminUserCreationPage'
import { AgencyAdminAccountStatusPage } from '../pages/AgencyAdminAccountStatusPage'
import { AgencyAdminIncidentHistoryPage } from '../pages/AgencyAdminIncidentHistoryPage'
import { AgencyAdminSettingsPage } from '../pages/AgencyAdminSettingsPage'
import { ProtectedRoute, RootRedirect } from '../features/auth'
import { CommandStaffDataProvider } from '../features/command-staff'
import { FieldResponderDataProvider } from '../features/field-responder'
import { AgencyAdminDataProvider } from '../features/agency-admin'
import { SystemAdminDataProvider } from '../features/system-admin'
import { ROUTES } from '../routes/paths'
import { RootLayout } from './RootLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { SystemAdminLayout } from './layouts/SystemAdminLayout'
import { AgencyAdminLayout } from './layouts/AgencyAdminLayout'
import { CommandStaffLayout } from './layouts/CommandStaffLayout'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <RootRedirect /> },
          { path: ROUTES.login, element: <AuthPage /> },
          { path: ROUTES.signup, element: <Navigate to={`${ROUTES.login}?mode=signup`} replace /> },
          { path: ROUTES.unauthorized, element: <UnauthorizedPage /> },
        ],
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}>
            <SystemAdminDataProvider>
              <SystemAdminLayout />
            </SystemAdminDataProvider>
          </ProtectedRoute>
        ),
        children: [
          { path: ROUTES.systemAdmin, element: <SystemAdminDashboardPage /> },
          { path: ROUTES.systemAdminAgencyValidation, element: <SystemAdminAgencyValidationPage /> },
          { path: ROUTES.systemAdminAgencyValidationDetail, element: <SystemAdminAgencyValidationDetailPage /> },
          { path: ROUTES.systemAdminAgencyStatus, element: <SystemAdminAgencyStatusPage /> },
          { path: ROUTES.systemAdminSettings, element: <SystemAdminSettingsPage /> },
        ],
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['AGENCY_ADMIN']}>
            <AgencyAdminDataProvider>
              <AgencyAdminLayout />
            </AgencyAdminDataProvider>
          </ProtectedRoute>
        ),
        children: [
          { path: ROUTES.agencyAdmin, element: <AgencyAdminDashboardPage /> },
          { path: ROUTES.agencyAdminUserCreation, element: <AgencyAdminUserCreationPage /> },
          { path: ROUTES.agencyAdminAccountStatus, element: <AgencyAdminAccountStatusPage /> },
          { path: ROUTES.agencyAdminIncidentHistory, element: <AgencyAdminIncidentHistoryPage /> },
          { path: ROUTES.agencyAdminSettings, element: <AgencyAdminSettingsPage /> },
        ],
      },
      {
        element: (
          <ProtectedRoute allowedRoles={['COMMAND_STAFF']}>
            <CommandStaffDataProvider>
              <CommandStaffLayout />
            </CommandStaffDataProvider>
          </ProtectedRoute>
        ),
        children: [
          { path: ROUTES.commandStaff, element: <CommandStaffDashboardPage /> },
          { path: ROUTES.commandStaffMedia, element: <CommandStaffDronesMediaPage /> },
          { path: ROUTES.commandStaffDroneRegistration, element: <CommandStaffDroneRegistrationPage /> },
          { path: ROUTES.commandStaffLiveMonitoring, element: <CommandStaffLiveMonitoringPage /> },
          { path: ROUTES.commandStaffDetections, element: <CommandStaffDetectionReviewPage /> },
          { path: ROUTES.commandStaffLogs, element: <CommandStaffLogsPage /> },
          { path: ROUTES.commandStaffIncidents, element: <CommandStaffIncidentsPage /> },
          { path: ROUTES.commandStaffIncidentDetail, element: <CommandStaffIncidentDetailPage /> },
          { path: ROUTES.commandStaffMap, element: <CommandStaffMapPage /> },
          { path: ROUTES.commandStaffSettings, element: <CommandStaffSettingsPage /> },
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
          { path: ROUTES.fieldResponderMap, element: <FieldResponderMapPage /> },
          { path: ROUTES.fieldResponderProfile, element: <FieldResponderProfilePage /> },
          { path: ROUTES.fieldResponderSettings, element: <FieldResponderSettingsPage /> },
          { path: ROUTES.fieldResponderMissionDetail, element: <FieldResponderMissionDetailPage /> },
        ],
      },
    ],
  },
])
