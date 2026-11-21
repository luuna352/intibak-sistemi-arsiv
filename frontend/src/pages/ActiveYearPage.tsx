import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { api } from '../api/client'
import { useActiveYear, type ActiveYear } from '../settings/activeYear'

// Ayarlar > Aktif eğitim-öğretim yılı (mockup: ekran 7). İlk yıl yazılır, ikinci yıl otomatik bir fazlasıdır.
export default function ActiveYearPage() {
  const { activeYear, setActiveYear } = useActiveYear()
  // Kutudaki metin; boşsa kayıtlı değer gösterilir. Kullanıcı yazınca kendi metni geçerli olur.
  const [input, setInput] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const text = input ?? (activeYear ? String(activeYear.startYear) : '')
  const typed = Number.parseInt(text, 10)
  // Yazarken canlı önizleme: 2026 -> 2026-2027.
  const preview = Number.isNaN(typed) ? '' : `${typed}-${typed + 1}`

  async function save() {
    setMessage(null)
    try {
      const saved = await api<ActiveYear>('/api/settings/active-year', {
        method: 'PUT',
        body: { startYear: Number.isNaN(typed) ? null : typed },
      })
      setActiveYear(saved)
      setInput(null)
      setMessage({ type: 'success', text: `Aktif yıl ${saved.label} olarak kaydedildi.` })
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
    }
  }

  return (
    <>
      <Typography variant="h5">Ayarlar · Aktif eğitim-öğretim yılı</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Tek bir yerde tutulur. Bir üye değiştirince giriş yapan herkes yeni yılı görür.
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2, maxWidth: 620 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2, maxWidth: 420 }}>
        <TextField
          label="İlk yıl"
          type="number"
          fullWidth
          value={text}
          onChange={(e) => setInput(e.target.value)}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Aktif yıl (otomatik)
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          {preview || '-'}
        </Typography>
        <Button variant="contained" onClick={save}>
          Kaydet
        </Button>
        {activeYear?.updatedByName && activeYear.updatedAt && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Son değiştiren: {activeYear.updatedByName} · {new Date(activeYear.updatedAt).toLocaleString('tr-TR')}
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2, maxWidth: 620 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Aktif yıl, ders planı eşleştirmesini belirler
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Öğrencinin yerleşeceği sınıf</TableCell>
              <TableCell>Kullanılacak ders planı</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activeYear?.classPlans.map((p) => (
              <TableRow key={p.classLevel}>
                <TableCell>
                  {p.classLevel}. sınıf ({p.classLevel * 2 - 1}. dönem)
                </TableCell>
                <TableCell>{p.planYear}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          İlgili yıla plan yüklenmemişse en yakın eski plan kullanılır (Ayarlar &gt; Ders planları sayfasında görünür).
        </Typography>
      </Paper>
    </>
  )
}
