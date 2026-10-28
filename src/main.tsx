import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/literata/wght.css'
import '@fontsource-variable/noto-sans-devanagari/wght.css'
import '@fontsource-variable/noto-sans-myanmar/wght.css'
import '@fontsource-variable/vazirmatn/wght.css'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './app/ErrorBoundary.tsx'
import { UpdatePrompt } from './app/UpdatePrompt.tsx'
import { isInstalledApp, persistWhenInstalled } from './app/storage'
import { initTheme } from './app/themeStore'
import { captureErrors } from './data/errorLog'

captureErrors()
initTheme()
// In de geïnstalleerde app meteen blijvende opslag aanvragen.
void persistWhenInstalled(isInstalledApp())

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Het element met id "root" ontbreekt in index.html.')
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    {/* Buiten de foutopvang, zodat je na een fout nog kunt bijwerken. */}
    <UpdatePrompt />
  </StrictMode>,
)
