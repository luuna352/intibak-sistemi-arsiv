import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableFooter from '@mui/material/TableFooter'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import { api } from '../api/client'
import { useActiveYear } from '../settings/activeYear'

// Backend'deki CurriculumService kayıtlarıyla aynı alanlar.
type Summary = { id: number; startYear: number; label: string; sourceFileName: string | null; courseCount: number }
type Course = {
  semester: number | null
  groupName: string | null
  code: string | null
  name: string
  compulsory: boolean
  language: 'TR' | 'EN'
  theoryHours: number | null
  practiceHours: number | null
  credit: number
  ects: number
}
type Detail = {
  id: number
  startYear: number
  label: string
  sourceFileName: string | null
  createdByName: string
  createdAt: string
  updatedByName: string | null
  updatedAt: string | null
  courses: Course[]
}
type Resolution = { requestedYear: number; requestedLabel: string; planId: number | null; planLabel: string | null; exact: boolean }

// Ekranda düzenlenen ders: kutular metin tutar, kaydederken sayıya çevrilir. key: React'in satırları ayırt etmesi
// için sabit numara (satır silinince/eklenince kutuların karışmaması için dizideki sıra kullanılmaz).
type EditRow = {
  key: number
  semester: string
  groupName: string
  code: string
  name: string
  zs: 'Z' | 'S'
  language: 'TR' | 'EN'
  theory: string
  practice: string
  credit: string
  ects: string
}

// Sekmeler: 1-4. sınıf (her sınıf 2 yarıyıl) ve yarıyılı olmayan seçmeli havuzları.
type TabKey = '1' | '2' | '3' | '4' | 'S'
const TABS: { key: TabKey; label: string }[] = [
  { key: '1', label: '1. Sınıf' },
  { key: '2', label: '2. Sınıf' },
  { key: '3', label: '3. Sınıf' },
  { key: '4', label: '4. Sınıf' },
  { key: 'S', label: 'Seçmeli havuzları' },
]

let nextKey = 1
const str = (n: number | null) => (n === null ? '' : String(n))

const toEdit = (c: Course): EditRow => ({
  key: nextKey++,
  semester: str(c.semester),
  groupName: c.groupName ?? '',
  code: c.code ?? '',
  name: c.name,
  zs: c.compulsory ? 'Z' : 'S',
  language: c.language,
  theory: str(c.theoryHours),
  practice: str(c.practiceHours),
  credit: str(c.credit),
  ects: str(c.ects),
})

// "3,5" gibi Türkçe virgüllü yazımı da kabul eder; boş kutu = değer yok (null).
const toNumber = (s: string): number | null => (s.trim() === '' ? null : Number(s.replace(',', '.')))

// Bir satırın hangi sekmede görüneceği: 1-2. yarıyıl -> 1. sınıf ...; yarıyıl boşsa seçmeli havuzu.
function tabOf(row: EditRow): TabKey {
  if (row.semester === '') return 'S'
  return String(Math.ceil(Number(row.semester) / 2)) as TabKey
}

type Total = { title: string; t: number; u: number; credit: number; ects: number }

// Sınıf sekmesinin yarıyıl toplamları. Toplam dosyadan okunmaz, ekrandaki derslerden hesaplanır.
// Yarıyılda grup (örn. "İME'ye gidenler / gitmeyenler") varsa her grup için ayrı toplam: grupsuz ortak dersler
// + o grubun dersleri.
function semesterTotals(rows: EditRow[], tab: TabKey): Total[] {
  if (tab === 'S') return []
  const totals: Total[] = []
  const first = Number(tab) * 2 - 1
  for (const semester of [first, first + 1]) {
    const inSemester = rows.filter((r) => r.semester === String(semester))
    const common = inSemester.filter((r) => r.groupName.trim() === '')
    const groups = [...new Set(inSemester.map((r) => r.groupName.trim()).filter((g) => g !== ''))]
    const variants = groups.length === 0 ? [{ title: '', rows: common }] : groups.map((g) => ({
      title: ` (${g})`,
      rows: [...common, ...inSemester.filter((r) => r.groupName.trim() === g)],
    }))
    for (const v of variants) {
      const sum = (pick: (r: EditRow) => string) => v.rows.reduce((acc, r) => acc + (toNumber(pick(r)) ?? 0), 0)
      totals.push({
        title: `${semester}. yarıyıl${v.title} toplamı`,
        t: sum((r) => r.theory),
        u: sum((r) => r.practice),
        credit: sum((r) => r.credit),
        ects: sum((r) => r.ects),
      })
    }
  }
  return totals
}

// Ondalık toplamlarda kayan nokta artığı görünmesin (16.499999 yerine 16.5).
const fmt = (n: number) => String(Math.round(n * 10) / 10)

// Ayarlar > Ders planları (mockup: ekran 5).
export default function PlansPage() {
  const { activeYear } = useActiveYear()
  const [plans, setPlans] = useState<Summary[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [rows, setRows] = useState<EditRow[]>([])
  const [tab, setTab] = useState<TabKey>('1')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [resolutions, setResolutions] = useState<{ classLevel: number; r: Resolution }[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadYear, setUploadYear] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function show(d: Detail) {
    setDetail(d)
    setRows(d.courses.map(toEdit))
  }

  // Açılışta plan listesi; en yeni plan seçilir.
  useEffect(() => {
    api<Summary[]>('/api/plans')
      .then((list) => {
        setPlans(list)
        if (list.length > 0) setSelectedId(list[list.length - 1].id)
      })
      .catch((e: Error) => setMessage({ type: 'error', text: e.message }))
  }, [])

  // Seçim değişince o planın dersleri yüklenir.
  useEffect(() => {
    if (selectedId === null) return
    api<Detail>(`/api/plans/${selectedId}`)
      .then(show)
      .catch((e: Error) => setMessage({ type: 'error', text: e.message }))
  }, [selectedId])

  // Aktif yıla göre 1-3. sınıfın kullanacağı plan; plan listesi değişince (yükleme sonrası) yeniden sorulur.
  useEffect(() => {
    if (!activeYear) return
    Promise.all(
      activeYear.classPlans.map((cp) =>
        api<Resolution>(`/api/plans/resolve?startYear=${parseInt(cp.planYear, 10)}`).then((r) => ({
          classLevel: cp.classLevel,
          r,
        })),
      ),
    )
      .then(setResolutions)
      .catch((e: Error) => setMessage({ type: 'error', text: e.message }))
  }, [activeYear, plans])

  function updateRow(key: number, field: keyof EditRow, value: string) {
    setRows(rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }

  function addRow() {
    // Sınıf sekmesinde o sınıfın ilk yarıyılına, havuz sekmesinde son havuzun adıyla eklenir.
    const lastGroup = [...rows].reverse().find((r) => r.semester === '')?.groupName ?? 'Seçmeli'
    setRows([
      ...rows,
      {
        key: nextKey++,
        semester: tab === 'S' ? '' : String(Number(tab) * 2 - 1),
        groupName: tab === 'S' ? lastGroup : '',
        code: '',
        name: '',
        zs: tab === 'S' ? 'S' : 'Z',
        language: 'TR',
        theory: '',
        practice: '',
        credit: '',
        ects: '',
      },
    ])
  }

  async function reloadList() {
    setPlans(await api<Summary[]>('/api/plans'))
  }

  async function save() {
    if (!detail) return
    setMessage(null)
    try {
      const saved = await api<Detail>(`/api/plans/${detail.id}`, {
        method: 'PUT',
        body: {
          courses: rows.map((r) => ({
            semester: r.semester === '' ? null : Number(r.semester),
            groupName: r.groupName,
            code: r.code,
            name: r.name,
            compulsory: r.zs === 'Z',
            language: r.language,
            theoryHours: toNumber(r.theory),
            practiceHours: toNumber(r.practice),
            credit: toNumber(r.credit),
            ects: toNumber(r.ects),
          })),
        },
      })
      show(saved)
      await reloadList()
      setMessage({ type: 'success', text: `${saved.label} planı kaydedildi.` })
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
    }
  }

  function openUpload() {
    setUploadYear(String(activeYear?.startYear ?? ''))
    setUploadFile(null)
    setUploadOpen(true)
  }

  async function upload() {
    if (!uploadFile) return
    setMessage(null)
    // Dosya JSON ile gönderilemez; form-data ile yıl ve dosya birlikte gider.
    const form = new FormData()
    form.append('startYear', uploadYear)
    form.append('file', uploadFile)
    try {
      const saved = await api<Detail>('/api/plans/import', { method: 'POST', body: form })
      setUploadOpen(false)
      await reloadList()
      setSelectedId(saved.id)
      show(saved)
      setTab('1')
      setMessage({
        type: 'success',
        text: `${saved.label} planı yüklendi (${saved.courses.length} ders). Yarıyıl toplamlarını orijinal planla karşılaştırın.`,
      })
    } catch (e) {
      // Hata (örn. "Excel 12. satır: ...") pencerenin içinde gösterilir; kullanıcı dosyayı düzeltip tekrar seçer.
      setMessage({ type: 'error', text: (e as Error).message })
      setUploadOpen(false)
    }
  }

  const uploadYearNumber = parseInt(uploadYear, 10)
  const replacing = plans.find((p) => p.startYear === uploadYearNumber)
  const visible = rows.filter((r) => tabOf(r) === tab)
  const totals = semesterTotals(rows, tab)

  return (
    <>
      <Typography variant="h5">Ayarlar · Ders planları</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Her akademik yılın planı şablona uygun Excel ile yüklenir ve burada düzenlenir. Toplamlar dosyadan okunmaz,
        sistem derslerden hesaplar; orijinal planla karşılaştırarak aktarımın doğru olduğunu kontrol edin.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField
          select
          size="small"
          label="Plan"
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          sx={{ minWidth: 240 }}
        >
          {plans.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.label} ({p.courseCount} ders)
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" onClick={openUpload}>
          Excel yükle
        </Button>
        {/* İndirme bağlantıları: tarayıcı session cookie'sini kendisi gönderir, dosya indirilir. */}
        {detail && (
          <Button variant="outlined" href={`/api/plans/${detail.id}/excel`}>
            Excel'e aktar
          </Button>
        )}
        <Button href="/api/plans/template">Boş şablonu indir</Button>
      </Box>

      {resolutions.length > 0 && activeYear && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
          <Typography variant="subtitle2">Aktif yıl {activeYear.label} için kullanılacak planlar</Typography>
          {resolutions.map(({ classLevel, r }) => (
            <Typography key={classLevel} variant="body2" color={r.exact ? 'text.primary' : 'warning.main'}>
              {classLevel}. sınıf → {r.requestedLabel}:{' '}
              {r.exact
                ? 'plan yüklü.'
                : r.planLabel
                  ? `bu yılın planı yok, en yakın eski plan (${r.planLabel}) kullanılır.`
                  : 'bu yıl ve öncesine ait plan yok.'}
            </Typography>
          ))}
        </Paper>
      )}

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {plans.length === 0 && !message && <Alert severity="info">Henüz plan yok. "Excel yükle" ile ilk planı ekleyin.</Alert>}

      {detail && (
        <>
          <Tabs value={tab} onChange={(_, v: TabKey) => setTab(v)} variant="scrollable" sx={{ mb: 1 }}>
            {TABS.map((t) => (
              <Tab key={t.key} value={t.key} label={t.label} />
            ))}
          </Tabs>

          <Paper sx={{ overflowX: 'auto', mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Yarıyıl</TableCell>
                  <TableCell>Grup</TableCell>
                  <TableCell>Kod</TableCell>
                  <TableCell>Ders adı</TableCell>
                  <TableCell>Z/S</TableCell>
                  <TableCell>Dil</TableCell>
                  <TableCell>T</TableCell>
                  <TableCell>U</TableCell>
                  <TableCell>Kredi</TableCell>
                  <TableCell>AKTS</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={r.semester}
                        onChange={(e) => updateRow(r.key, 'semester', e.target.value)}
                        sx={{ width: 90 }}
                      >
                        <MenuItem value="">Havuz</MenuItem>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <MenuItem key={s} value={String(s)}>
                            {s}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={r.groupName}
                        onChange={(e) => updateRow(r.key, 'groupName', e.target.value)}
                        sx={{ width: 150 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={r.code}
                        placeholder="kod yok"
                        onChange={(e) => updateRow(r.key, 'code', e.target.value)}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={r.name}
                        onChange={(e) => updateRow(r.key, 'name', e.target.value)}
                        sx={{ minWidth: 240 }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={r.zs}
                        onChange={(e) => updateRow(r.key, 'zs', e.target.value)}
                        sx={{ width: 64 }}
                      >
                        <MenuItem value="Z">Z</MenuItem>
                        <MenuItem value="S">S</MenuItem>
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={r.language}
                        onChange={(e) => updateRow(r.key, 'language', e.target.value)}
                        sx={{ width: 72 }}
                      >
                        <MenuItem value="TR">TR</MenuItem>
                        <MenuItem value="EN">EN</MenuItem>
                      </TextField>
                    </TableCell>
                    {(['theory', 'practice', 'credit', 'ects'] as const).map((field) => (
                      <TableCell key={field}>
                        <TextField
                          size="small"
                          value={r[field]}
                          onChange={(e) => updateRow(r.key, field, e.target.value)}
                          sx={{ width: 64 }}
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <IconButton
                        size="small"
                        aria-label="Dersi sil"
                        onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                      >
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {totals.length > 0 && (
                <TableFooter>
                  {totals.map((t) => (
                    <TableRow key={t.title} sx={{ bgcolor: 'action.hover' }}>
                      <TableCell colSpan={6} sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                        {t.title}
                      </TableCell>
                      {[t.t, t.u, t.credit, t.ects].map((n, i) => (
                        <TableCell key={i} sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                          {fmt(n)}
                        </TableCell>
                      ))}
                      <TableCell />
                    </TableRow>
                  ))}
                </TableFooter>
              )}
            </Table>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
            <Button variant="outlined" onClick={addRow}>
              + Ders ekle
            </Button>
            <Button variant="contained" onClick={save}>
              Kaydet
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {detail.sourceFileName && `Yüklenen dosya: ${detail.sourceFileName} · `}
            Oluşturan: {detail.createdByName}
            {detail.updatedByName &&
              detail.updatedAt &&
              ` · Son değiştiren: ${detail.updatedByName} · ${new Date(detail.updatedAt).toLocaleString('tr-TR')}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Seçmeli yer tutucuları (örn. "BSM4XX Teknik Seçmeli Ders 4") yarıyıl dersi olarak girilir, çünkü o yarıyılın
            toplamına dahildir. Havuz dersleri yarıyıl "Havuz" seçilip grup adıyla girilir; toplamlara katılmaz.
          </Typography>
        </>
      )}

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)}>
        <DialogTitle>Ders planı yükle</DialogTitle>
        <DialogContent>
          <TextField
            label="Planın ilk yılı (örn. 2025 → 2025-2026)"
            value={uploadYear}
            onChange={(e) => setUploadYear(e.target.value)}
            fullWidth
            sx={{ mt: 1, mb: 2 }}
          />
          {replacing && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {replacing.label} planı zaten var. Yüklenen dosya mevcut {replacing.courseCount} dersin yerine geçer.
            </Alert>
          )}
          {/* Gerçek dosya kutusu gizli; görünür düğme ona tıklar. Sadece .xlsx seçilebilir. */}
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx"
            hidden
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
          />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button variant="outlined" onClick={() => fileInput.current?.click()}>
              Dosya seç
            </Button>
            <Typography variant="body2">{uploadFile ? uploadFile.name : 'Dosya seçilmedi'}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Dosya "Boş şablonu indir" ile alınan şablonla aynı sütunlarda olmalı (Yarıyıl, Grup, Kod, Ders adı, Z/S,
            Dil, T, U, Kredi, AKTS).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)}>Vazgeç</Button>
          <Button variant="contained" onClick={upload} disabled={!uploadFile || Number.isNaN(uploadYearNumber)}>
            Yükle
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
