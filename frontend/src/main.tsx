import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from './theme'
import App from './App'

// Uygulamanın giriş noktası: index.html'deki <div id="root"> içine React uygulaması çizilir.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      {/* CssBaseline: tarayıcılar arası farkları sıfırlayan temel CSS */}
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
