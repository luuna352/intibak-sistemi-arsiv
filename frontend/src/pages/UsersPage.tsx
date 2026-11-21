import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { api } from '../api/client'
import { useAuth, type Role, type User } from '../auth/auth'

// Ayarlar > Kullanıcılar (mockup: ekran 4). 4 sabit rol; görünen ad değiştirilir, şifre sıfırlanır.
export default function UsersPage() {
  const { refreshMe } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  // Ekranda düzenlenen görünen adlar (rol -> metin). Kaydet'e basılınca sadece değişenler gönderilir.
  const [names, setNames] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Backend'den gelen listeyi ekrana koyar: tablo satırları + düzenlenebilir ad kutularının başlangıç değerleri.
  function show(list: User[]) {
    setUsers(list)
    setNames(Object.fromEntries(list.map((u) => [u.role, u.displayName])))
  }

  async function load() {
    show(await api<User[]>('/api/users'))
  }

  // Sayfa açılınca liste bir kez yüklenir.
  useEffect(() => {
    api<User[]>('/api/users')
      .then(show)
      .catch((e: Error) => setMessage({ type: 'error', text: e.message }))
  }, [])

  async function saveNames() {
    setMessage(null)
    try {
      const changed = users.filter((u) => names[u.role] !== u.displayName)
      for (const u of changed) {
        await api(`/api/users/${u.role}/display-name`, { method: 'PUT', body: { displayName: names[u.role] } })
      }
      await load()
      // Kendi adımızı değiştirdiysek üst çubuktaki ad da tazelensin.
      await refreshMe()
      setMessage({ type: 'success', text: changed.length ? 'Görünen adlar kaydedildi.' : 'Değişiklik yok.' })
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
    }
  }

  async function resetPassword(role: Role, label: string) {
    if (!window.confirm(`${label} hesabının şifresi sıfırlansın mı? Hesabın sahibi girişte yeni şifresini yazacak.`)) {
      return
    }
    setMessage(null)
    try {
      await api(`/api/users/${role}/reset-password`, { method: 'POST' })
      await load()
      setMessage({ type: 'success', text: `${label}: şifre sıfırlandı. Girişte yazılan parola yeni şifre olacak.` })
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
    }
  }

  return (
    <>
      <Typography variant="h5">Ayarlar · Kullanıcılar</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        4 sabit rol hesabı. Komisyon üyeleri değişince yeni hesap açılmaz, rolün ekranda görünen adı güncellenir. Tüm
        roller eşit yetkilidir.
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Paper sx={{ overflowX: 'auto', mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Rol (sabit hesap)</TableCell>
              <TableCell>Ekranda görünen ad</TableCell>
              <TableCell>Şifre</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.role}>
                <TableCell>{u.roleLabel}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    // Dar ekranda kutu sıkışıp okunmaz hale gelmesin; gerekirse tablo yatay kayar.
                    sx={{ minWidth: 240 }}
                    value={names[u.role] ?? ''}
                    onChange={(e) => setNames({ ...names, [u.role]: e.target.value })}
                    slotProps={{ htmlInput: { maxLength: 200 } }}
                  />
                </TableCell>
                <TableCell>
                  {/* Şifrenin kendisi hiçbir zaman gösterilmez; sadece belirlenip belirlenmediği. */}
                  {u.passwordSet ? (
                    <Chip size="small" label="Belirlendi" />
                  ) : (
                    <Chip size="small" color="warning" label="İlk girişte belirlenecek" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ whiteSpace: 'nowrap' }}
                    onClick={() => resetPassword(u.role, u.roleLabel)}
                  >
                    Şifreyi sıfırla
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Button variant="contained" onClick={saveNames} sx={{ mb: 3 }}>
        Görünen adları kaydet
      </Button>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Şifre unutulursa
        </Typography>
        <Box component="ol" sx={{ m: 0, pl: 3, lineHeight: 1.8 }}>
          <li>Şifresini unutan kişi, başka bir yetkili üyeye (Başkan, diğer üye veya Sekreter) bildirir.</li>
          <li>
            O üye bu ekranda unutan hesabın yanındaki <b>Şifreyi sıfırla</b> düğmesine basar. Kimse başkasının
            şifresini göremez.
          </li>
          <li>Şifresi sıfırlanan kişi giriş ekranında rolünü seçer ve yazdığı yeni parola hesabın şifresi olur.</li>
        </Box>
      </Paper>
    </>
  )
}
