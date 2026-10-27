import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UpdatePrompt } from './app/UpdatePrompt.tsx'

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Het element met id "root" ontbreekt in index.html.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
    <UpdatePrompt />
  </StrictMode>,
)
