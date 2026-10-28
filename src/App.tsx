import type { ReactNode } from 'react'
import { AppShell } from './app/AppShell'
import { useNavigationMemory } from './app/navigation'
import { pageFromHash, type Page } from './app/routes'
import { useHashLocation } from './app/useHashLocation'
import { CoursePage } from './pages/CoursePage'
import { LessonPage } from './pages/LessonPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OverviewPage } from './pages/OverviewPage'
import { ScriptTestPage } from './pages/ScriptTestPage'
import { SettingsPage } from './pages/SettingsPage'

function pageContent(page: Page | null): ReactNode {
  if (page === null) {
    return <NotFoundPage />
  }
  switch (page.page) {
    case 'overview':
      return <OverviewPage />
    case 'scripts':
      return <ScriptTestPage />
    case 'settings':
      return <SettingsPage />
    case 'course':
      return <CoursePage key={page.language} language={page.language} />
    case 'lesson':
      return (
        <LessonPage
          key={`${page.language}/${page.lesson}`}
          language={page.language}
          lesson={page.lesson}
        />
      )
  }
}

function App() {
  const hash = useHashLocation()
  // Een nieuwe pagina begint bovenaan; terug brengt je waar je was.
  useNavigationMemory(hash)
  const page = pageFromHash(hash)

  return <AppShell page={page}>{pageContent(page)}</AppShell>
}

export default App
