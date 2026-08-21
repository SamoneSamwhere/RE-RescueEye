import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from './queryClient'
import { router } from './router'
import { AuthProvider } from '../features/auth'
import { MissionStoreProvider } from '../state/MissionStore'
import { UserStoreProvider } from '../state/UserStore'
import { AgencyStoreProvider } from '../state/AgencyStore'
import { IncidentStoreProvider } from '../state/IncidentStore'
import { DetectionStoreProvider } from '../state/DetectionStore'
import { MediaAssetStoreProvider } from '../state/MediaAssetStore'
import { NotificationStoreProvider } from '../state/NotificationStore'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserStoreProvider>
        <AgencyStoreProvider>
          <AuthProvider>
            <MediaAssetStoreProvider>
              <DetectionStoreProvider>
                <IncidentStoreProvider>
                  <MissionStoreProvider>
                    <NotificationStoreProvider>
                      <RouterProvider router={router} />
                    </NotificationStoreProvider>
                  </MissionStoreProvider>
                </IncidentStoreProvider>
              </DetectionStoreProvider>
            </MediaAssetStoreProvider>
          </AuthProvider>
        </AgencyStoreProvider>
      </UserStoreProvider>
    </QueryClientProvider>
  )
}

export default App
