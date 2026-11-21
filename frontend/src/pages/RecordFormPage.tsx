import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { api } from '../api/client'
import GradeTablePreview from '../records/GradeTablePreview'
import MatchTable from '../records/MatchTable'
import {
  statusColor,
  toEditMatch,
  toMatchInput,
  type EditMatch,
  type Evaluation,
  type RecordDetail,
  type YalovaCourse,
} from '../records/records'
import { useActiveYear } from '../settings/activeYear'

type Option = { value: string; label: string }
type GradeTableSummary = { id: number; code: string; name: string }
type PlanSummary = { id: number; startYear: number; label: string }
type PlanDetail = { id: number; label: string; courses: YalovaCourse[] }
type Resolution = { requestedLabel: string; planId: number | null; planLabel: string | null }
// Kayıt detayı: öğrenci bilgileri + PT, plan ve eşleştirmenin hesaplanmış hali.
type Detail = RecordDetail & { gradeTableId: number | null; planId: number | null; evaluation: Evaluation }

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

// Yeni intibak formu (/yeni-form) ve var olan kaydın formu (/kayitlar/:id): öğrenci bilgileri, ders eşleştirme,
// otomatik sınıf/dönem ve "Kontrol ettim / Onaylıyorum" kutusu. Word çıktısı sonraki aşamada (7 Aralık).
export default function RecordFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeYear } = useActiveYear()
  const [types, setTypes] = useState<Option[]>([])
  const [gradeTables, setGradeTables] = useState<GradeTableSummary[]>([])
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [record, setRecord] = useState<Detail | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [gradeTableId, setGradeTableId] = useState('')
  const [planId, setPlanId] = useState('')
  const [planCourses, setPlanCourses] = useState<YalovaCourse[]>([])
  const [matches, setMatches] = useState<EditMatch[]>([])
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [suggested, setSuggested] = useState<(Resolution & { classLevel: number }) | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Açılır listeler: geçiş türleri, PT tabloları, ders planları. Yeni kayıtta ilk PT ve aktif yılın (ya da en yakın
  // eski) planı önceden seçilir.
  useEffect(() => {
    Promise.all([
      api<Option[]>('/api/records/transfer-types'),
      api<GradeTableSummary[]>('/api/grade-tables'),
      api<PlanSummary[]>('/api/plans'),
    ])
      .then(([t, g, p]) => {
        setTypes(t)
        setGradeTables(g)
        setPlans(p)
        if (!id) {
          if (g.length > 0) setGradeTableId(String(g[0].id))
          const fallback = p.filter((x) => x.startYear <= (activeYear?.startYear ?? 9999)).pop() ?? p[p.length - 1]
          if (fallback) setPlanId(String(fallback.id))
        }
      })
      .catch((e: Error) => setMessage({ type: 'error', text: e.message }))
  }, [id, activeYear])

  // Adres /kayitlar/5 ise kayıt yüklenir; /yeni-form ise form boş kalır.
  useEffect(() => {
    if (!id) return
    api<Detail>(`/api/records/${id}`)
      .then(show)
      .catch((e: Error) => setMessage({ type: 'error', text: e.message }))
  }, [id])

  // Seçilen planın dersleri sağ taraftaki açılır listeye gelir.
  useEffect(() => {
    if (planId === '') return
    api<PlanDetail>(`/api/plans/${planId}`)
      .then((p) => setPlanCourses(p.courses))
      .catch((e: Error) => setMessage({ type: 'error', text: e.message }))
  }, [planId])

  // Canlı hesap: form değiştikçe (yarım saniye bekleyip) backend'e kaydetmeden hesaplatılır. Hesap kuralları tek
  // yerde (backend MatchCalculator) durur; ekran sadece sonucu gösterir.
  useEffect(() => {
    const timer = setTimeout(() => {
      api<Evaluation>('/api/records/evaluate', {
        method: 'POST',
        body: {
          transferType: form.transferType || null,
          gradeTableId: gradeTableId === '' ? null : Number(gradeTableId),
          matches: matches.map(toMatchInput),
        },
      })
        .then(setEvaluation)
        .catch(() => {
          // Önizleme hatası formu engellemez; kaydederken kurallar ayrıca kontrol edilir.
        })
    }, 500)
    return () => clearTimeout(timer)
  }, [form.transferType, gradeTableId, matches])

  // Hesaplanan sınıfa göre hangi planın kullanılması gerektiği (aktif yıl kuralı + en yakın eski plan).
  const classLevel = evaluation?.placement.classLevel
  useEffect(() => {
    const planYear = activeYear?.classPlans.find((c) => c.classLevel === classLevel)?.planYear
    if (!planYear) return
    // Öneri hangi sınıf için hesaplandıysa o sınıfla saklanır (metin, cevap gelene kadar eski sınıfı karıştırmasın).
    api<Resolution>(`/api/plans/resolve?startYear=${parseInt(planYear, 10)}`)
      .then((r) => setSuggested({ ...r, classLevel: classLevel ?? 1 }))
      .catch(() => setSuggested(null))
  }, [classLevel, activeYear])

  function show(d: Detail) {
    setRecord(d)
    setForm(toForm(d))
    setGradeTableId(d.gradeTableId === null ? '' : String(d.gradeTableId))
    setPlanId(d.planId === null ? '' : String(d.planId))
    setMatches(d.evaluation.matches.map(toEditMatch))
    setEvaluation(d.evaluation)
  }

  const set = (field: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value })

  async function save() {
    setMessage(null)
    const body = {
      ...form,
      transferType: form.transferType || null,
      // <input type="date"> "2026-09-15" verir; boşsa tarih yok.
      registrationDate: form.registrationDate || null,
      gradeTableId: gradeTableId === '' ? null : Number(gradeTableId),
      planId: planId === '' ? null : Number(planId),
      matches: matches.map(toMatchInput),
      confirmed,
    }
    try {
      const saved = record
        ? await api<Detail>(`/api/records/${record.id}`, { method: 'PUT', body })
        : await api<Detail>('/api/records', { method: 'POST', body })
      show(saved)
      // Her kayıt yeniden onay ister: sonraki değişiklikte kutu tekrar işaretlenmeli.
      setConfirmed(false)
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
      setRecord(await api<Detail>(`/api/records/${record.id}/${action}`, { method: 'POST' }))
      setMessage({ type: 'success', text: action === 'cancel' ? 'Kayıt iptal edildi.' : 'İptal geri alındı.' })
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
    }
  }

  const cancelled = record?.status === 'IPTAL'
  const placement = evaluation?.placement
  const selectedPlan = plans.find((p) => String(p.id) === planId)

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
        <Typography variant="h5">{record ? 'İntibak formu' : 'Yeni intibak formu'}</Typography>
        {record && <Chip label={record.statusLabel} color={statusColor[record.status]} />}
        <Box sx={{ flex: 1 }} />
        <Button onClick={() => navigate('/kayitlar')}>← Listeye dön</Button>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Tüm alanlar elle düzenlenebilir (ileride transkript okuma hatalarına karşı).
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
        <Typography variant="h6" sx={{ mb: 2 }}>
          Ders eşleştirme
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <TextField select size="small" label="Not dönüşüm tablosu" value={gradeTableId} disabled={cancelled}
            onChange={(e) => setGradeTableId(e.target.value)} sx={{ minWidth: 260 }}>
            {gradeTables.map((g) => (
              <MenuItem key={g.id} value={String(g.id)}>
                {g.code} · {g.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Yalova ders planı" value={planId} disabled={cancelled}
            onChange={(e) => setPlanId(e.target.value)} sx={{ minWidth: 200 }}>
            {plans.map((p) => (
              <MenuItem key={p.id} value={String(p.id)}>
                {p.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        {plans.length === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Henüz ders planı yüklenmemiş. Ayarlar &gt; Ders planları'ndan yükleyin.
          </Alert>
        )}
        <MatchTable matches={matches} onChange={setMatches} results={evaluation?.matches ?? []}
          planCourses={planCourses} disabled={cancelled} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Notlar seçilen PT tablosuyla Yalova notuna çevrilir. Puan iki aralığın arasında kalırsa ya da birleştirilen
          derslerin ortalaması iki harf arasında kalırsa öğrenci lehine üstteki not verilir. İngilizce Yalova dersi
          Türkçe dersle sayılmaz; FD/FF/DZ notuyla ders sayılmaz.
        </Typography>
        {/* Seçilen PT tablosu burada da görünür: kontrol için başka sayfaya gitmeye gerek kalmasın. */}
        <GradeTablePreview gradeTableId={gradeTableId} />
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Yerleşim (otomatik)</Typography>
        {placement && (
          <>
            <Typography>
              Sayılan toplam kredi: <b>{placement.countedCredit}</b>
            </Typography>
            <Typography>
              Yerleşeceği sınıf/dönem: <b>{placement.classLevel}. sınıf ({placement.semester}. dönem)</b>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {placement.reason}
            </Typography>
          </>
        )}
        {suggested && (
          <Typography variant="body2" sx={{ mt: 1 }}
            color={suggested.planId !== null && String(suggested.planId) !== planId ? 'warning.main' : 'text.secondary'}>
            Aktif yıl {activeYear?.label} için {suggested.classLevel}. sınıfın planı {suggested.requestedLabel}
            {suggested.planLabel && suggested.planLabel !== suggested.requestedLabel
              ? ` (yüklenmemiş, en yakın eski plan ${suggested.planLabel})`
              : ''}
            {suggested.planId === null ? ': bu yıl ve öncesine ait plan yok.' : '.'}
            {suggested.planId !== null && String(suggested.planId) !== planId && (
              <Button size="small" sx={{ ml: 1 }} disabled={cancelled}
                onClick={() => setPlanId(String(suggested.planId))}>
                Bu planı kullan (seçili: {selectedPlan?.label ?? 'yok'})
              </Button>
            )}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          &lt;30 kredi: 1. sınıf · 30-60: 2. sınıf (3. dönem) · &gt;60: 3. sınıf (5. dönem) · DGS: 5. dönem
        </Typography>
      </Paper>

      <Paper sx={{ p: 2, mb: 1 }}>
        <FormControlLabel
          control={<Checkbox checked={confirmed} disabled={cancelled} onChange={(e) => setConfirmed(e.target.checked)} />}
          label="Kontrol ettim / Onaylıyorum (notlar ve dersler doğru aktarıldı)"
        />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
          {/* Onay kutusu işaretlenmeden kaydedilemez (backend de ayrıca kontrol eder). */}
          <Button variant="contained" onClick={save} disabled={cancelled || !confirmed}>
            Kaydet
          </Button>
          {record && !cancelled && (
            <Button color="error" onClick={() => changeStatus('cancel')}>
              İptal et
            </Button>
          )}
          {cancelled && <Button onClick={() => changeStatus('restore')}>İptali geri al</Button>}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Onay kutusu işaretlenmeden kayıt yapılamaz. Word çıktısı 7 Aralık aşamasında eklenecek.
        </Typography>
      </Paper>
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
