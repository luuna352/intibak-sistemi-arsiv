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
import CourseBoard from '../records/CourseBoard'
import GradeTablePreview from '../records/GradeTablePreview'
import MatchTable from '../records/MatchTable'
import RecordDocuments from '../records/RecordDocuments'
import SameStudentRecords from '../records/SameStudentRecords'
import { EMPTY_PENDING, uploadPending, type PendingDocuments } from '../records/documents'
import {
  DEPARTMENT_LANGUAGE_OPTIONS,
  PREP_OPTIONS,
  applySuggestions,
  statusColor,
  toEditMatch,
  toMatchInput,
  type CourseView,
  type DocumentSection,
  type EditMatch,
  type Evaluation,
  type RecordDetail,
} from '../records/records'
import {
  sendPlan,
  toEditSource,
  toSourceInput,
  type EditSource,
  type PlanCourse,
  type SourceCourseView,
} from '../records/sourceCourses'
import { useActiveYear } from '../settings/activeYear'

type Option = { value: string; label: string }
type GradeTableSummary = { id: number; code: string; name: string }
type PlanSummary = { id: number; startYear: number; label: string }
type PlanDetail = { id: number; label: string; courses: PlanCourse[] }
type Resolution = { requestedLabel: string; planId: number | null; planLabel: string | null }
// Kayıt detayı: öğrenci bilgileri + PT, plan ve eşleştirmenin hesaplanmış hali.
type Detail = RecordDetail & {
  gradeTableId: number | null
  planId: number | null
  evaluation: Evaluation
  // Komisyonun sınıf/dönem kararı; ikisi de null ise sistemin önerisi geçerli.
  placementClassLevel: number | null
  placementSemester: number | null
  // Öğrencinin transkriptindeki bütün dersler (V14).
  sourceCourses: SourceCourseView[]
  // Kaydın eğitim-öğretim yılı (V15): 2026 = "2026-2027"; aktif yıl sonradan değişse de kayıt kendi yılında kalır.
  academicStartYear: number
  academicYearLabel: string
}

// Komisyonun seçebileceği sınıf/dönemler: 1. sınıf (1. ve 2. dönem) ... 4. sınıf (7. ve 8. dönem). Değer "2-3" gibi.
const PLACEMENTS = [1, 2, 3, 4].flatMap((c) => [c * 2 - 1, c * 2].map((s) => ({ value: `${c}-${s}`, classLevel: c, semester: s })))

// Formdaki kutular: hepsi metin; boş kutu backend'e boş metin gider, backend null yapar.
type Form = {
  tcNo: string
  fullName: string
  transferType: string
  university: string
  facultyDepartment: string
  registrationDate: string
  prepStatus: string
  departmentLanguage: string
  // Boşsa (yeni kayıtta) ayarlardaki aktif yıl kullanılır.
  academicStartYear: string
}
const EMPTY: Form = {
  tcNo: '',
  fullName: '',
  transferType: '',
  university: '',
  facultyDepartment: '',
  registrationDate: '',
  prepStatus: 'UNKNOWN',
  departmentLanguage: 'UNKNOWN',
  academicStartYear: '',
}

const toForm = (d: Detail): Form => ({
  tcNo: d.tcNo,
  fullName: d.fullName,
  transferType: d.transferType,
  university: d.university ?? '',
  facultyDepartment: d.facultyDepartment ?? '',
  registrationDate: d.registrationDate ?? '',
  prepStatus: d.prepStatus,
  departmentLanguage: d.departmentLanguage,
  academicStartYear: String(d.academicStartYear),
})

// Yıl seçenekleri: aktif yılın 5 yıl öncesinden 1 yıl sonrasına; kaydın kendi yılı bu aralıkta değilse o da eklenir.
function yearOptions(activeStartYear: number | undefined, current: string): number[] {
  const years = activeStartYear === undefined ? [] : [-5, -4, -3, -2, -1, 0, 1].map((d) => activeStartYear + d)
  const own = Number(current)
  if (current !== '' && !years.includes(own)) years.push(own)
  return years.sort((a, b) => b - a)
}

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
  const [planCourses, setPlanCourses] = useState<PlanCourse[]>([])
  // Öğrencinin ders listesi (sol sütun) ve eşleştirme satırları; satırlardaki karşı dersler listeye key ile bağlı.
  const [sources, setSources] = useState<EditSource[]>([])
  const [matches, setMatches] = useState<EditMatch[]>([])
  // Öğrencinin ders içeriklerinin bölümleri ("Belgede bul" için): kayıtlı içerik belgesinden ya da içerikler
  // transkriptteyse transkriptten okunur (RecordDocuments).
  const [sections, setSections] = useState<DocumentSection[]>([])
  // Yeni kayıtta seçilen transkript/içerik dosyaları: "Kaydet" ile kayıt oluşunca yüklenir.
  const [pendingDocs, setPendingDocs] = useState<PendingDocuments>(EMPTY_PENDING)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [suggested, setSuggested] = useState<(Resolution & { classLevel: number }) | null>(null)
  // Yerleşim kararı: boş = sistemin önerisini kullan; "2-4" = komisyon 2. sınıf 4. dönem dedi.
  const [placementChoice, setPlacementChoice] = useState("")
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
      const keys = matches.map((m) => m.key)
      const { list, indexOf } = sendPlan(sources, matches)
      api<Evaluation>('/api/records/evaluate', {
        method: 'POST',
        body: {
          transferType: form.transferType || null,
          // Hazırlık şartı (kural 2b) önizlemede de hesaba girer.
          prepStatus: form.prepStatus,
          departmentLanguage: form.departmentLanguage,
          gradeTableId: gradeTableId === '' ? null : Number(gradeTableId),
          sourceCourses: list.map(toSourceInput),
          matches: matches.map((m) => toMatchInput(m, indexOf)),
        },
      })
        .then((e) => {
          setEvaluation(e)
          // Komisyonun dokunmadığı satırlarda "Sayıldı mı?" sistemin önerisini izler.
          setMatches((current) => applySuggestions(current, keys, e.matches))
        })
        .catch(() => {
          // Önizleme hatası formu engellemez; kaydederken kurallar ayrıca kontrol edilir.
        })
    }, 500)
    return () => clearTimeout(timer)
  }, [form.transferType, form.prepStatus, form.departmentLanguage, gradeTableId, sources, matches])

  // Geçerli sınıf: komisyon karar verdiyse o, vermediyse sistemin önerisi. Plan önerisi bu sınıfa göre yapılır.
  const decided = PLACEMENTS.find((p) => p.value === placementChoice)
  const classLevel = decided?.classLevel ?? evaluation?.placement.classLevel
  // Hangi planın kullanılması gerektiği (aktif yıl kuralı + en yakın eski plan).
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
    // Kayıttaki ders listesi ekrana alınır; karşı dersler listedeki sırasıyla (source) bağlanır. V14'ten önce
    // açılmış kayıtlarda karşı dersin listede yeri yoktur (source boş): o ders listenin sonuna eklenir.
    const list = d.sourceCourses.map(toEditSource)
    const extra: EditSource[] = []
    const keyOf = (c: CourseView) => {
      if (c.source !== null && list[c.source]) return list[c.source].key
      const s = toEditSource({ code: c.code, name: c.name, semester: c.semester, credit: c.credit, ects: c.ects,
        language: c.language, grade: c.grade })
      extra.push(s)
      return s.key
    }
    setMatches(d.evaluation.matches.map((m) => toEditMatch(m, keyOf)))
    setSources([...list, ...extra])
    setEvaluation(d.evaluation)
    setPlacementChoice(
      d.placementClassLevel !== null && d.placementSemester !== null ? `${d.placementClassLevel}-${d.placementSemester}` : "",
    )
  }

  // Kaydın yılı: seçildiyse o; yeni kayıtta seçilmediyse ayarlardaki aktif yıl (Word formunun başında yazar).
  const yearValue = form.academicStartYear || (activeYear ? String(activeYear.startYear) : '')

  const set = (field: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value })

  async function save() {
    setMessage(null)
    const { list, indexOf } = sendPlan(sources, matches)
    const body = {
      ...form,
      transferType: form.transferType || null,
      // <input type="date"> "2026-09-15" verir; boşsa tarih yok.
      registrationDate: form.registrationDate || null,
      gradeTableId: gradeTableId === '' ? null : Number(gradeTableId),
      planId: planId === '' ? null : Number(planId),
      sourceCourses: list.map(toSourceInput),
      matches: matches.map((m) => toMatchInput(m, indexOf)),
      placementClassLevel: decided?.classLevel ?? null,
      placementSemester: decided?.semester ?? null,
      academicStartYear: yearValue === '' ? null : Number(yearValue),
      confirmed,
    }
    try {
      const saved = record
        ? await api<Detail>(`/api/records/${record.id}`, { method: 'PUT', body })
        : await api<Detail>('/api/records', { method: 'POST', body })
      // Yeni kayıtta bekleyen belgeler, kayıt numarası alınınca yüklenir. Yüklenemezse kayıt yine açılmış olur;
      // dosya Belgeler bölümünden tekrar yüklenir.
      const uploadError = record ? null : await uploadPending(saved.id, pendingDocs)
      if (!record) setPendingDocs(EMPTY_PENDING)
      show(saved)
      // Her kayıt yeniden onay ister: sonraki değişiklikte kutu tekrar işaretlenmeli.
      setConfirmed(false)
      setMessage(uploadError
        ? { type: 'error', text: `Kayıt kaydedildi ama belge yüklenemedi: ${uploadError}` }
        : { type: 'success', text: 'Kayıt kaydedildi.' })
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
        <Typography variant="h5">{record ? 'İNTİBAK FORMU' : 'YENİ İNTİBAK FORMU'}</Typography>
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
          {/* Kural 2b: karşı ders İngilizceyse bu iki bilgiden biri şartı sağlamalı (transkriptte yazar). */}
          <TextField select label="İngilizce hazırlık" value={form.prepStatus} onChange={set('prepStatus')}
            disabled={cancelled} helperText="Sınavla muaf olan da 'Geçti' sayılır">
            {PREP_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Eğitim-öğretim yılı" value={yearValue} onChange={set('academicStartYear')}
            disabled={cancelled} helperText="Word formunun başındaki yıl; yeni kayıtta aktif yıl gelir">
            {yearOptions(activeYear?.startYear, yearValue).map((y) => (
              <MenuItem key={y} value={String(y)}>
                {y}-{y + 1}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Geldiği bölümün eğitim dili" value={form.departmentLanguage}
            onChange={set('departmentLanguage')} disabled={cancelled}
            helperText="En az %30 İngilizceyse hazırlık şartı aranmaz">
            {DEPARTMENT_LANGUAGE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        {/* Aynı TC'li başka kayıt varsa (öğrenci birden çok yatay geçiş yaptıysa) burada listelenir. */}
        <SameStudentRecords tcNo={form.tcNo} excludeId={record?.id ?? null} />
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Belgeler
        </Typography>
        <RecordDocuments recordId={record?.id ?? null} pending={pendingDocs} onPendingChange={setPendingDocs}
          onSections={setSections} disabled={cancelled} />
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
        <CourseBoard sources={sources} onSourcesChange={setSources} matches={matches} onMatchesChange={setMatches}
          planCourses={planCourses} sections={sections} disabled={cancelled} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Eşleştirme satırları
        </Typography>
        <MatchTable matches={matches} onChange={setMatches} results={evaluation?.matches ?? []} sources={sources}
          planCourses={planCourses} sections={sections} disabled={cancelled} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Notlar seçilen PT tablosuyla Yalova notuna çevrilir. Puan iki aralığın arasında kalırsa ya da birleştirilen
          derslerin ortalaması iki harf arasında kalırsa öğrenci lehine üstteki not verilir. İngilizce Yalova dersi
          Türkçe dersle ve FD/FF/DZ notuyla sistem "sayılmaz" önerir; komisyon yine de sayabilir.
        </Typography>
        {/* Seçilen PT tablosu burada da görünür: kontrol için başka sayfaya gitmeye gerek kalmasın. */}
        <GradeTablePreview gradeTableId={gradeTableId} />
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Yerleşim</Typography>
        {placement && (
          <>
            <Typography>
              Sayılan toplam kredi: <b>{placement.countedCredit}</b>
            </Typography>
            <Typography>
              Sistemin önerisi: <b>{placement.classLevel}. sınıf ({placement.semester}. dönem)</b>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {placement.reason}
            </Typography>
            {/* Sistem sadece önerir; komisyon farklı karar verebilir (kural 7-8). Boş seçim = öneri geçerli. */}
            <TextField select size="small" label="Komisyon kararı" value={placementChoice} disabled={cancelled}
              onChange={(e) => setPlacementChoice(e.target.value)} sx={{ mt: 2, minWidth: 260 }}
              slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}>
              <MenuItem value="">Önerilen: {placement.classLevel}. sınıf ({placement.semester}. dönem)</MenuItem>
              {PLACEMENTS.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  {p.classLevel}. sınıf ({p.semester}. dönem)
                </MenuItem>
              ))}
            </TextField>
            {decided && (
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                Komisyon kararı geçerli: {decided.classLevel}. sınıf ({decided.semester}. dönem). Öneriye dönmek için
                "Önerilen" seçeneğini seçin.
              </Typography>
            )}
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
