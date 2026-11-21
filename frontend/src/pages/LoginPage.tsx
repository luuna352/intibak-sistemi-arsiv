import { useEffect, useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { api } from '../api/client'
import { useAuth, type Role } from '../auth/auth'

type RoleOption = { role: Role; label: string }

// Giriş ekranı (mockup: ekran 1). Kullanıcı adı yazılmaz; rol listeden seçilir, sadece parola girilir.
// "Şifremi unuttum" yok: şifre Ayarlar > Kullanıcılar'dan başka bir üye tarafından sıfırlanır.
export default function LoginPage() {
  const { login } = useAuth()
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [role, setRole] = useState<Role | ''>('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Açılır listedeki roller backend'den gelir (GET /api/auth/roles, giriş gerektirmez).
  useEffect(() => {
    api<RoleOption[]>('/api/auth/roles')
      .then(setRoles)
      .catch(() => setError("Backend'e ulaşılamadı."))
  }, [])

  async function submit(e: FormEvent) {
    // Form gönderilince tarayıcının sayfayı yenilemesini engeller; isteği biz atıyoruz.
    e.preventDefault()
    if (!role || !password) {
      setError('Kullanıcı ve parola girilmelidir.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await login(role, password)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', display: 'flex', justifyContent: 'center', pt: 6, px: 2 }}>
      <Paper component="form" onSubmit={submit} elevation={0} sx={{ width: 400, maxWidth: '100%' }}>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <img src="/logo.png" alt="Yalova Üniversitesi" style={{ width: 230, maxWidth: '100%' }} />
        </Box>
        <TextField
          select
          fullWidth
          label="Kullanıcı"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          sx={{ mb: 2 }}
        >
          {roles.map((r) => (
            <MenuItem key={r.role} value={r.role}>
              {r.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          type="password"
          label="Parola"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2 }}
        />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button type="submit" variant="contained" fullWidth size="large" disabled={busy}>
          Giriş yap
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          İlk girişinizse ya da şifreniz sıfırlandıysa, yazdığınız parola yeni şifreniz olur (en az 8 karakter).
        </Typography>
      </Paper>
    </Box>
  )
}
