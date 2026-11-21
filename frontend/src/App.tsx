import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'

// Backend'in GET /api/health cevabı (HealthController.HealthResponse ile aynı alanlar).
type Health = { status: string; database: string }

// İskelet ekranı: backend'e ve veritabanına ulaşılabildiğini gösterir. Adım 2'de yerini giriş ekranı alacak.
export default function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Sayfa açılınca bir kez çalışır: /api/health çağrılır (Vite bunu localhost:8080'e yönlendirir).
  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<Health>
      })
      .then(setHealth)
      .catch((e: Error) => setError(e.message))
  }, [])

  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6">İntibak Sistemi</Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ maxWidth: 480, mx: 'auto', mt: 6, px: 2 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <img src="/logo.png" alt="Yalova Üniversitesi" style={{ width: 200, maxWidth: '100%' }} />
          <Box sx={{ mt: 2 }}>
            {!health && !error && <CircularProgress size={24} />}
            {health && (
              <Alert severity="success">
                Backend: {health.status} · Veritabanı: {health.database}
              </Alert>
            )}
            {error && <Alert severity="error">Backend'e ulaşılamadı ({error})</Alert>}
          </Box>
        </Paper>
      </Box>
    </>
  )
}
