import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Trigger Vercel Deploy
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
