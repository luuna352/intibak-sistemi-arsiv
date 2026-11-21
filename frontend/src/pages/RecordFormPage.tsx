import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { api } from '../api/client'
import { statusColor, type RecordDetail } from '../records/records'

type Option = { value: string; label: string }

// Formdaki kutular: hepsi metin; boş kutu backend'e boş metin gider, backend null yapar.
type Form = {
  tcNo: string
  fullName: string
  transferType: string
  university: string
  facultyDepartment: string
  registrationDate: string
}
const EMPTY: Form = { tcNo: '', fullName: '', transferType: '', university: '', facultyDepartment: '', registrationDate: '' }

const toForm = (d: RecordDetail): Form => ({
  tcNo: d.tcNo,
  fullName: d.fullName,
  transferType: d.transferType,
  university: d.university ?? '',
  facultyDepartment: d.facultyDepartment ?? '',
  registrationDate: d.registrationDate ?? '',
})

// Yeni intibak formu (/yeni-form) ve var olan kaydın formu (/kayitlar/:id). Şimdilik öğrenci bilgileri elle girilir;
// ders eşleştirme, sınıf hesabı, onay kutusu ve Word çıktısı sonraki adımda (7 Aralık) eklenecek.
export default function RecordFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [types, setTypes] = useState<Option[]>([])
  const [record, setRecord] = useState<RecordDetail | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    api<Option[]>('/api/records/transfer-types')
      .then(setTypes)
      .catch((e: Error) => setMessage({ type: 'error', text: e.message }))
  }, [])

  // Adres /kayitlar/5 ise kayıt yüklenir; /yeni-form ise form boş kalır.
  useEffect(() => {
    if (!id) return
    api<RecordDetail>(`/api/records/${id}`)
      .then((d) => {
        setRecord(d)
        setForm(toForm(d))
      })
      .catch((e: Error) => setMessage({ type: 'error', text: e.message }))
  }, [id])

  const set = (field: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value })

  async function save() {
    setMessage(null)
    const body = {
      ...form,
      transferType: form.transferType || null,
      // <input type="date"> "2026-09-15" verir; boşsa tarih yok.
      registrationDate: form.registrationDate || null,
    }
    try {
      const saved = record
        ? await api<RecordDetail>(`/api/records/${record.id}`, { method: 'PUT', body })
        : await api<RecordDetail>('/api/records', { method: 'POST', body })
      setRecord(saved)
      setForm(toForm(saved))
      setMessage({ type: 'success', text: 'Kayıt kaydedildi.' })
      // Yeni kayıt açıldıysa adres kaydın adresine çevrilir (yenilenince aynı kayıt açılsın).
      if (!record) navigate(`/kayitlar/${saved.id}`, { replace: true })
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
    }
  }

  async function changeStatus(action: 'cancel' | 'restore') {
    if (!record) return
    setMessage(null)
    try {
      setRecord(await api<RecordDetail>(`/api/records/${record.id}/${action}`, { method: 'POST' }))
      setMessage({ type: 'success', text: action === 'cancel' ? 'Kayıt iptal edildi.' : 'İptal geri alındı.' })
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
    }
  }

  const cancelled = record?.status === 'IPTAL'

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
        <Typography variant="h5">{record ? 'İntibak formu' : 'Yeni intibak formu'}</Typography>
        {record && <Chip label={record.statusLabel} color={statusColor[record.status]} />}
        <Box sx={{ flex: 1 }} />
        <Button onClick={() => navigate('/kayitlar')}>← Listeye dön</Button>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Tüm alanlar elle düzenlenebilir.
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      {cancelled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Bu kayıt iptal edilmiş. Değiştirmek için önce iptali geri alın.
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Öğrenci bilgileri
        </Typography>
        {/* İki sütunlu düzen; dar ekranda tek sütun. */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField label="TC Kimlik No" value={form.tcNo} onChange={set('tcNo')} disabled={cancelled}
            slotProps={{ htmlInput: { maxLength: 11, inputMode: 'numeric' } }} required />
          <TextField label="Ad-Soyad" value={form.fullName} onChange={set('fullName')} disabled={cancelled} required />
          <TextField label="Geldiği üniversite" value={form.university} onChange={set('university')} disabled={cancelled} />
          <TextField label="Fakülte / Bölüm" value={form.facultyDepartment} onChange={set('facultyDepartment')}
            disabled={cancelled} />
          <TextField label="Kayıt tarihi" type="date" value={form.registrationDate} onChange={set('registrationDate')}
            disabled={cancelled} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField select label="Geçiş türü" value={form.transferType} onChange={set('transferType')}
            disabled={cancelled} required>
            {types.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Ders eşleştirme</Typography>
        <Typography color="text.secondary">
          Ders eşleştirme, sınıf/dönem hesabı, "Kontrol ettim / Onaylıyorum" kutusu ve Word çıktısı bir sonraki aşamada
          (7 Aralık) bu forma eklenecek.
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
        <Button variant="contained" onClick={save} disabled={cancelled}>
          Kaydet
        </Button>
        {record && !cancelled && (
          <Button color="error" onClick={() => changeStatus('cancel')}>
            İptal et
          </Button>
        )}
        {cancelled && <Button onClick={() => changeStatus('restore')}>İptali geri al</Button>}
      </Box>
      {record && (
        <Typography variant="body2" color="text.secondary">
          Kaydı açan: {record.createdByName} · {new Date(record.createdAt).toLocaleString('tr-TR')}
          {record.updatedByName &&
            record.updatedAt &&
            ` · Son değiştiren: ${record.updatedByName} · ${new Date(record.updatedAt).toLocaleString('tr-TR')}`}
        </Typography>
      )}
    </>
  )
}
