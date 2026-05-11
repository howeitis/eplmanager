import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Standalone dev/preview entry. The `plm-app-root` wrapper is required so the
// CSS scoping in src/index.css applies — when the package is consumed as a
// library, the EPLManagerApp wrapper (src/lib.tsx) adds the same root.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="plm-app-root">
      <App />
    </div>
  </StrictMode>,
)
