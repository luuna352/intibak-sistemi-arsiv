import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { AuthProvider } from './auth/AuthProvider'
import { theme } from './theme'
import App from './App'

// Uygulamanın giriş noktası: tema, adres yönlendirmesi (router) ve giriş bilgisi burada bağlanır.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      {/* CssBaseline: tarayıcılar arası farkları sıfırlayan temel CSS */}
      <CssBaseline />
      <BrowserRouter>
        {/* AuthProvider: giriş yapan kullanıcı bilgisini tüm sayfalara sağlar */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
