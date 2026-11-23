import { memo, useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import NoContentMark from './NoContentMark'
import { NO_CONTENT_NO_NAME, courseKey, findSection, type DocumentSection, type EditMatch } from './records'
import {
  autoMatches,
  emptySource,
  isBL,
  newMatch,
  noContentNoName,
  normalizeName,
  rowsOfSource,
  rowsOfYalova,
  sourceContent,
  sourceNames,
  type EditSource,
  type PlanCourse,
} from './sourceCourses'

type Props = {
  sources: EditSource[]
  onSourcesChange: Dispatch<SetStateAction<EditSource[]>>
  matches: EditMatch[]
  onMatchesChange: Dispatch<SetStateAction<EditMatch[]>>
  // Seçilen Yalova planının dersleri (yarıyılı ve seçmeli grubuyla).
  planCourses: PlanCourse[]
  // Öğrencinin ders içerik belgesinin bölümleri (A3): dersin içeriği gösterilirken ve eşleştirilirken kullanılır.
  sections: DocumentSection[]
  disabled: boolean
}

// Sol tablonun sütunları: seç, kod, ad, yarıyıl, kredi, AKTS, not, dil, durum, içerik/sil düğmeleri.
const SOURCE_COLUMNS = '30px 64px minmax(110px, 1fr) 36px 40px 40px 44px 52px 84px 60px'

/**
 * İki sütunlu karşılaştırma ekranı. Solda öğrencinin bütün dersleri (eşleşen ve eşleşmeyen birlikte, elle
 * düzenlenebilir), sağda seçilen Yalova planının dersleri. Dersin üzerine tıklanınca içeriği açılır.
 * "Otomatik eşleştir": adı aynı olanlar (kural 4) ve Türk Dili / tarih dersleri (kural 3) birebir eşleşir.
 * Diğerlerini komisyon iki taraftan seçip "Seçilenleri eşleştir" ile eşleştirir; o satırda içerik karşılaştırması
 * yapılır (kural 5). İçeriği olmayan ve adı tutmayan Yalova dersinin yanında kırmızı ünlem çıkar (kural 5b).
 * Otomatik eşleştirme düğmeyle yapılır, yazarken kendiliğinden değil: yarım yazılmış adla yanlış eşleşme olmasın ve
 * komisyonun sildiği satır geri gelmesin.
 */
export default function CourseBoard({
  sources,
  onSourcesChange,
  matches,
  onMatchesChange,
  planCourses,
  sections,
  disabled,
}: Props) {
  // İki taraftaki işaretli dersler (sol: ders key'i, sağ: courseKey) ve içeriği açık dersler.
  const [pickedSources, setPickedSources] = useState<number[]>([])
  const [pickedYalova, setPickedYalova] = useState<string[]>([])
  const [openSources, setOpenSources] = useState<number[]>([])
  const [openYalova, setOpenYalova] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const auto = useMemo(() => autoMatches(sources, planCourses, matches), [sources, planCourses, matches])
  const names = useMemo(() => sourceNames(sources), [sources])

  // Satır bileşenleri memo'lu: bir kutuya yazınca sadece o satır yeniden çizilsin (200 derse kadar liste olabilir).
  // Bu yüzden düğme işlevleri useCallback ile sabit tutulur ve state'e önceki değer üzerinden yazılır.
  const onField = useCallback(
    (key: number, field: keyof EditSource, value: string) =>
      onSourcesChange((prev) => prev.map((s) => (s.key === key ? { ...s, [field]: value } : s))),
    [onSourcesChange],
  )
  // Ders listeden silinince bulunduğu eşleştirmelerden de çıkar (eşleştirme satırı kalır, komisyon düzenler).
  const onDelete = useCallback(
    (key: number) => {
      onSourcesChange((prev) => prev.filter((s) => s.key !== key))
      onMatchesChange((prev) =>
        prev.map((m) =>
          m.incoming.some((c) => c.sourceKey === key)
            ? { ...m, incoming: m.incoming.filter((c) => c.sourceKey !== key) }
            : m,
        ),
      )
      setPickedSources((prev) => prev.filter((k) => k !== key))
    },
    [onSourcesChange, onMatchesChange],
  )
  const toggleSource = useCallback((key: number) => setPickedSources((prev) => toggle(prev, key)), [])
  const toggleYalova = useCallback((key: string) => setPickedYalova((prev) => toggle(prev, key)), [])
  const openSource = useCallback((key: number) => setOpenSources((prev) => toggle(prev, key)), [])
  const openCourse = useCallback((key: string) => setOpenYalova((prev) => toggle(prev, key)), [])

  // Seçili dersler (silinen ya da plan değişince kaybolan dersler kendiliğinden düşer).
  const chosenSources = sources.filter((s) => pickedSources.includes(s.key) && s.name.trim() !== '')
  const chosenYalova = planCourses.filter((c) => pickedYalova.includes(courseKey(c)))

  // Elle eşleştirme: seçilen öğrenci dersleri + seçilen Yalova dersleri tek satır (çoğa-bir ya da bire-çok).
  // Karşı dersin içeriği belgede adıyla aranır.
  function matchPicked() {
    const contentOf = (key: number) => findSection(sections, sources.find((s) => s.key === key)?.name ?? '')?.content ?? ''
    onMatchesChange((prev) => [...prev, newMatch(chosenSources.map((s) => s.key), chosenYalova, contentOf)])
    setPickedSources([])
    setPickedYalova([])
  }

  // Sağ taraf: aramaya uyan dersler yarıyıla göre gruplanır (zorunlular önce).
  const groups = useMemo(() => {
    const q = normalizeName(search)
    const shown = planCourses.filter(
      (c) => q === '' || normalizeName(`${c.code ?? ''} ${c.name}`).includes(q),
    )
    const bySemester = new Map<number | null, PlanCourse[]>()
    for (const c of shown) bySemester.set(c.semester, [...(bySemester.get(c.semester) ?? []), c])
    return [...bySemester.entries()]
      .sort(([a], [b]) => (a ?? 99) - (b ?? 99))
      .map(([semester, list]) => ({
        semester,
        courses: [...list].sort((a, b) => Number(b.compulsory) - Number(a.compulsory)),
      }))
  }, [planCourses, search])

  const unmatched = sources.filter((s) => s.name.trim() !== '' && rowsOfSource(matches, s.key).length === 0).length

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Karşılaştırma
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {sources.length} öğrenci dersi · {unmatched} eşleşmemiş
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" size="small" disabled={disabled || auto.length === 0}
          onClick={() => onMatchesChange((prev) => [...prev, ...autoMatches(sources, planCourses, prev)])}>
          Otomatik eşleştir ({auto.length})
        </Button>
        <Button variant="outlined" size="small"
          disabled={disabled || chosenSources.length === 0 || chosenYalova.length === 0}
          onClick={matchPicked}>
          Seçilenleri eşleştir ({chosenSources.length} → {chosenYalova.length})
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Otomatik eşleştirme: adı aynı dersler ve Türk Dili / Atatürk İlkeleri dersleri. Adı farklı dersleri iki
        taraftan işaretleyip "Seçilenleri eşleştir" ile eşleştirin; o satırda içerik karşılaştırması yapılır. Dersin
        içeriğini görmek için ▾ düğmesine basın.
      </Typography>

      {/* Geniş ekranda iki sütun (sol: öğrenci, sağ: Yalova), dar ekranda alt alta; her sütun kendi içinde kayar.
          minmax(0, ...): sol tablo geniş gelirse sağ sütunu sıkıştırmasın, kendi içinde yana kaysın. */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 3fr) minmax(300px, 2fr)' }, gap: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Öğrencinin dersleri (transkriptteki bütün dersler)
          </Typography>
          <Box sx={{ maxHeight: 560, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Box sx={{ minWidth: 600 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: SOURCE_COLUMNS, gap: 0.5, px: 0.5, py: 0.5,
                position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1, borderBottom: 1,
                borderColor: 'divider' }}>
                {['', 'Kod', 'Ders adı', 'Yy', 'Kredi', 'AKTS', 'Not', 'Dil', 'Durum', ''].map((h, i) => (
                  <Typography key={i} variant="caption" sx={{ fontWeight: 600 }}>
                    {h}
                  </Typography>
                ))}
              </Box>
              {sources.map((s) => {
                const open = openSources.includes(s.key)
                return (
                  <SourceRow key={s.key} s={s} disabled={disabled} checked={pickedSources.includes(s.key)}
                    rows={rowsOfSource(matches, s.key).join(', ')}
                    content={open ? sourceContent(s, matches, sections) : null}
                    onField={onField} onToggle={toggleSource} onOpen={openSource} onDelete={onDelete} />
                )
              })}
              {sources.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                  Henüz ders yok. Öğrencinin transkriptindeki dersleri "+ Ders ekle" ile girin.
                </Typography>
              )}
            </Box>
          </Box>
          <Button size="small" sx={{ mt: 1 }} disabled={disabled}
            onClick={() => onSourcesChange((prev) => [...prev, emptySource()])}>
            + Ders ekle
          </Button>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
              Yalova dersleri (seçilen plan)
            </Typography>
            <TextField size="small" variant="standard" placeholder="Ara (kod ya da ad)" value={search}
              onChange={(e) => setSearch(e.target.value)} sx={{ width: 180 }} />
          </Box>
          <Box sx={{ maxHeight: 560, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
            {planCourses.length === 0 && (
              <Alert severity="info" sx={{ m: 1 }}>
                Önce Yalova ders planını seçin.
              </Alert>
            )}
            {groups.map((g) => (
              <Box key={g.semester ?? 'none'}>
                <Typography variant="caption" sx={{ display: 'block', px: 1, py: 0.5, bgcolor: 'action.hover',
                  fontWeight: 600 }}>
                  {g.semester ? `${g.semester}. yarıyıl` : 'Yarıyılı belirtilmemiş'}
                </Typography>
                {g.courses.map((c) => {
                  const key = courseKey(c)
                  const open = openYalova.includes(key)
                  return (
                    <YalovaRow key={key} c={c} courseId={key} disabled={disabled} open={open}
                      checked={pickedYalova.includes(key)} rows={rowsOfYalova(matches, c).join(', ')}
                      mark={noContentNoName(c, names)} onToggle={toggleYalova} onOpen={openCourse} />
                  )
                })}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Paper>
  )
}

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

// Eşleştirme durumu etiketi: "2. eşl." (yeşil) ya da "Eşleşmedi".
function StatusChip({ rows }: { rows: string }) {
  return rows === '' ? (
    <Chip size="small" variant="outlined" label="Eşleşmedi" />
  ) : (
    <Chip size="small" color="success" variant="outlined" label={`${rows}. eşl.`} />
  )
}

type SourceRowProps = {
  s: EditSource
  checked: boolean
  // Bulunduğu eşleştirme satırları ("1, 3"; boş = eşleşmedi). Metin olarak verilir ki memo karşılaştırabilsin.
  rows: string
  // Açıksa dersin içeriği, kapalıysa null.
  content: string | null
  disabled: boolean
  onField: (key: number, field: keyof EditSource, value: string) => void
  onToggle: (key: number) => void
  onOpen: (key: number) => void
  onDelete: (key: number) => void
}

// Sol tablonun bir satırı: kutular doğrudan düzenlenir (transkript okuma hatalarını düzeltmek için).
const SourceRow = memo(function SourceRow({ s, checked, rows, content, disabled, onField, onToggle, onOpen,
  onDelete }: SourceRowProps) {
  const field = (name: keyof EditSource) => ({
    value: s[name],
    disabled,
    size: 'small' as const,
    variant: 'standard' as const,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onField(s.key, name, e.target.value),
  })
  return (
    <Box sx={{ px: 0.5, borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: SOURCE_COLUMNS, gap: 0.5, alignItems: 'center' }}>
        <Checkbox size="small" sx={{ p: 0.5 }} checked={checked} disabled={disabled || s.name.trim() === ''}
          onChange={() => onToggle(s.key)} slotProps={{ input: { 'aria-label': `${s.name} seç` } }} />
        <TextField {...field('code')} slotProps={{ htmlInput: { 'aria-label': 'Kod' } }} />
        <TextField {...field('name')} slotProps={{ htmlInput: { 'aria-label': 'Ders adı' } }} />
        <TextField {...field('semester')} slotProps={{ htmlInput: { 'aria-label': 'Yarıyıl' } }} />
        <TextField {...field('credit')} slotProps={{ htmlInput: { 'aria-label': 'Kredi' } }} />
        <TextField {...field('ects')} slotProps={{ htmlInput: { 'aria-label': 'AKTS' } }} />
        <TextField {...field('grade')} error={isBL(s.grade)} slotProps={{ htmlInput: { 'aria-label': 'Not' } }} />
        <TextField {...field('language')} select slotProps={{ htmlInput: { 'aria-label': 'Dil' } }}>
          <MenuItem value="TR">TR</MenuItem>
          <MenuItem value="EN">EN</MenuItem>
        </TextField>
        <StatusChip rows={rows} />
        <Box sx={{ display: 'flex' }}>
          <IconButton size="small" aria-label="İçeriği göster" onClick={() => onOpen(s.key)}>
            {content !== null ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
          <IconButton size="small" aria-label="Dersi sil" disabled={disabled} onClick={() => onDelete(s.key)}>
            <DeleteOutlined fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      {/* BL: önceki üniversitede notsuz geçirilmiş ders; gerçek harf önceki kaydın transkriptinden yazılır. */}
      {isBL(s.grade) && (
        <Typography variant="caption" color="error" sx={{ display: 'block', pl: 5 }}>
          BL notsuzdur: gerçek harf notunu öğrencinin önceki kaydının transkriptinden yazın.
        </Typography>
      )}
      {content !== null && <ContentBox content={content} empty="İçerik yok: eşleştirmede yazılmamış, belgede de bu adla bölüm bulunamadı." />}
    </Box>
  )
})

type YalovaRowProps = {
  c: PlanCourse
  courseId: string
  checked: boolean
  rows: string
  // Kural 5b: içeriği yok ve öğrencinin listesinde aynı adlı ders yok.
  mark: boolean
  open: boolean
  disabled: boolean
  onToggle: (key: string) => void
  onOpen: (key: string) => void
}

// Sağ listenin bir satırı: Yalova dersi (plandan, burada düzenlenmez; içerik plan ekranında girilir).
const YalovaRow = memo(function YalovaRow({ c, courseId, checked, rows, mark, open, disabled, onToggle,
  onOpen }: YalovaRowProps) {
  return (
    <Box sx={{ px: 0.5, borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Checkbox size="small" sx={{ p: 0.5 }} checked={checked} disabled={disabled}
          onChange={() => onToggle(courseId)} slotProps={{ input: { 'aria-label': `${c.name} seç` } }} />
        <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onOpen(courseId)}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            color={mark ? 'error' : undefined}>
            {mark && <NoContentMark />}
            {c.code ? `${c.code} ` : ''}
            {c.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {c.credit ?? '-'} kr · {c.ects ?? '-'} AKTS{c.language === 'EN' ? ' · EN' : ''}
            {c.compulsory ? '' : ` · seçmeli${c.groupName ? ` (${c.groupName})` : ''}`}
            {mark ? ` · ${NO_CONTENT_NO_NAME.toLocaleLowerCase('tr')}` : ''}
          </Typography>
        </Box>
        <StatusChip rows={rows} />
        <IconButton size="small" aria-label="İçeriği göster" onClick={() => onOpen(courseId)}>
          {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </Box>
      {open && <ContentBox content={c.content ?? ''} empty="Bu dersin içeriği planda girilmemiş." />}
    </Box>
  )
})

// Açılan içerik: satır satır, uzunsa kendi içinde kayar.
function ContentBox({ content, empty }: { content: string; empty: string }) {
  return (
    <Typography variant="body2" component="div" color={content.trim() === '' ? 'text.secondary' : undefined}
      sx={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto', bgcolor: 'action.hover', borderRadius: 1,
        p: 1, mb: 1, ml: 4 }}>
      {content.trim() === '' ? empty : content}
    </Typography>
  )
}
