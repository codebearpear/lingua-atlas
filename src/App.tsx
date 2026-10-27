import { useEffect } from 'react'
import { AppShell } from './app/AppShell'
import { routeFromHash } from './app/routes'
import { useHashLocation } from './app/useHashLocation'
import { NotFoundPage } from './pages/NotFoundPage'
import { OverviewPage } from './pages/OverviewPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  const route = routeFromHash(useHashLocation())

  // Een nieuwe pagina begint bovenaan.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  return (
    <AppShell current={route}>
      {route === 'overview' && <OverviewPage />}
      {route === 'settings' && <SettingsPage />}
      {route === null && <NotFoundPage />}
    </AppShell>
  )
}

export default App
