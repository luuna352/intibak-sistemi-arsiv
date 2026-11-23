import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import ContentComparison from './ContentComparison'
import NoContentMark from './NoContentMark'
import {
  emptyMatch,
  findSection,
  lacksContent,
  newKey,
  withPlanTopics,
  type DocumentSection,
  type EditMatch,
  type MatchView,
  type YalovaCourse,
} from './records'
import { isBL, sendPlan, sourceLabel, type EditSource } from './sourceCourses'

type Props = {
  matches: EditMatch[]
  onChange: (matches: EditMatch[]) => void
  // Hesap sonucu (backend önizlemesi); satır sırası matches ile aynı.
  results: MatchView[]
  // Öğrencinin ders listesi (soldaki açılır listenin seçenekleri; not, kredi gibi bilgiler buradan okunur).
  sources: EditSource[]
  // Seçilen Yalova planının dersleri (sağ taraftaki açılır listenin seçenekleri).
  planCourses: YalovaCourse[]
  // Öğrencinin ders içerik belgesinin bölümleri (A3); içerik karşılaştırmasında seçilir.
  sections: DocumentSection[]
  disabled: boolean
}

const label = (c: YalovaCourse) =>
  `${c.code ? c.code + ' ' : ''}${c.name} (${c.credit ?? '-'} kr, ${c.ects ?? '-'} AKTS${c.language === 'EN' ? ', EN' : ''})`
// Plandaki ders ile seçili ders aynı mı? Kod + ad birlikte karşılaştırılır (kodu olmayan dersler de var).
const same = (a: YalovaCourse, b: YalovaCourse) => a.code === b.code && a.name === b.name

/**
 * Ders eşleştirme tablosu: her satırın solunda karşı kurumun ders(ler)i, sağında Yalova'nın ders(ler)i.
 * Solda birden çok ders = çoğa-bir, sağda birden çok ders = bire-çok. Notların Yalova karşılığı, birleşik not ve
 * satırın sorunları backend hesabından (results) gelir.
 */
export default function MatchTable({ matches, onChange, results, sources, planCourses, sections, disabled }: Props) {
  const update = (key: number, change: Partial<EditMatch>) =>
    onChange(matches.map((m) => (m.key === key ? { ...m, ...change } : m)))

  // Seçilebilecek dersler: adı yazılmış olanlar. indexOf: dersin önizlemeye giden listedeki sırası.
  const named = sources.filter((s) => s.name.trim() !== '')
  const { indexOf } = sendPlan(sources, matches)

  // Soldaki seçim değişince: kalan derslerin içeriği korunur, yeni seçilen dersin içeriği öğrencinin içerik
  // belgesinde adıyla aranır (bulunamazsa boş; komisyon içerik karşılaştırmasında yazar ya da seçer).
  const pickIncoming = (m: EditMatch, value: EditSource[]) =>
    value.map(
      (s) =>
        m.incoming.find((c) => c.sourceKey === s.key) ?? {
          key: newKey(),
          sourceKey: s.key,
          content: findSection(sections, s.name)?.content ?? '',
        },
    )

  return (
    <>
      {matches.map((m, i) => {
        const r = results[i]
        return (
          <Paper key={m.key} variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
              <Typography variant="subtitle2">{i + 1}. eşleştirme</Typography>
              {r?.grade && <Chip size="small" color="primary" label={`Yalova notu: ${r.grade}`} />}
              {r && <Chip size="small" label={`Yalova kredisi: ${r.yalovaCredit}`} />}
              {/* Kural 3-4 doğrudan kabul (yeşil); kural 5 içerik karşılaştırması, kararı komisyon verir (mavi). */}
              {r?.basisLabel && (
                <Chip size="small" variant="outlined" label={r.basisLabel}
                  color={r.basis === 'CONTENT' ? 'info' : 'success'} />
              )}
              <Box sx={{ flex: 1 }} />
              <FormControlLabel
                label="Sayıldı mı?"
                control={
                  <Checkbox
                    checked={m.counted}
                    disabled={disabled}
                    onChange={(e) => update(m.key, { counted: e.target.checked, countedTouched: true })}
                  />
                }
              />
              <IconButton
                aria-label="Eşleştirmeyi sil"
                disabled={disabled}
                onClick={() => onChange(matches.filter((x) => x.key !== m.key))}
              >
                <DeleteOutlined fontSize="small" />
              </IconButton>
            </Box>

            {/* Geniş ekranda iki sütun (sol: karşı kurum, sağ: Yalova), dar ekranda alt alta. */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Karşı kurumun dersi, öğrencinin ders listesinden (birden çok seçilebilir: çoğa-bir)
                </Typography>
                <Autocomplete
                  multiple
                  size="small"
                  disabled={disabled}
                  options={named}
                  value={m.incoming.flatMap((c) => sources.filter((s) => s.key === c.sourceKey))}
                  getOptionLabel={sourceLabel}
                  isOptionEqualToValue={(a, b) => a.key === b.key}
                  onChange={(_, value) => update(m.key, { incoming: pickIncoming(m, value) })}
                  noOptionsText="Öğrencinin ders listesi boş (yukarıdaki listeye ders ekleyin)"
                  renderInput={(params) => <TextField {...params} placeholder="Kod ya da ad yazın" />}
                  sx={{ mt: 1 }}
                />
                {m.incoming.map((c) => {
                  const s = sources.find((x) => x.key === c.sourceKey)
                  if (!s) return null
                  // Notun seçilen PT tablosuna göre Yalova karşılığı (önizleme sonucunda listedeki sırasıyla bulunur).
                  const converted = r?.incoming.find((x) => x.source === indexOf(s.key))?.convertedGrade
                  return (
                    <Box key={c.key} sx={{ mt: 0.5 }}>
                      <Typography variant="body2">
                        {s.name || '(adsız)'} · not: {s.grade || '-'}
                        {converted ? ` → ${converted}` : ''}
                      </Typography>
                      {/* BL: önceki üniversitede alınıp oraya notsuz geçirilmiş ders. Bizde harf notu işlediği için
                          gerçek harf öğrencinin önceki kaydının transkriptinden yazılır. */}
                      {isBL(s.grade) && (
                        <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                          BL notsuzdur: gerçek harf notunu öğrencinin önceki kaydının transkriptinden yazın.
                        </Typography>
                      )}
                    </Box>
                  )
                })}
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Yalova'nın muaf sayılan dersi (birden çok seçilebilir: bire-çok)
                </Typography>
                <Autocomplete
                  multiple
                  size="small"
                  disabled={disabled}
                  options={planCourses}
                  value={m.yalova}
                  getOptionLabel={label}
                  isOptionEqualToValue={same}
                  onChange={(_, value) => update(m.key, withPlanTopics(m, value))}
                  // Seçilen dersler etiket olarak; içeriği olmayan ve adı tutmayan dersin etiketinde kırmızı ünlem
                  // (kural 5b).
                  renderValue={(value, getItemProps) =>
                    value.map((c, index) => {
                      const { key, ...itemProps } = getItemProps({ index })
                      const missing = lacksContent(m, r?.basis, c)
                      return (
                        <Chip key={key} {...itemProps} size="small" label={label(c)}
                          color={missing ? 'error' : 'default'} variant={missing ? 'outlined' : 'filled'}
                          icon={missing ? <NoContentMark /> : undefined} />
                      )
                    })
                  }
                  noOptionsText="Planda ders yok (önce ders planı seçin)"
                  renderInput={(params) => <TextField {...params} placeholder="Kod ya da ad yazın" />}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>

            <ContentComparison match={m} result={r} sections={sections} sources={sources} disabled={disabled} onChange={(change) => update(m.key, change)} />

            {r && r.problems.length > 0 && (
              <Alert severity={m.counted ? 'error' : 'warning'} sx={{ mt: 1 }}>
                {m.counted ? 'Bu satır bu haliyle sayılamaz (eksik bilgi): ' : ''}
                {r.problems.join(' ')}
              </Alert>
            )}
            {/* Kural uyarısı engel değil: sistem "sayılmaz" önerir, komisyon isterse kutuyu işaretleyip sayar. */}
            {r && r.warnings.length > 0 && (
              <Alert severity={m.counted ? 'info' : 'warning'} sx={{ mt: 1 }}>
                Kurala göre sayılmaz önerisi: {r.warnings.join(' ')}
                {m.counted ? ' Komisyon kararıyla sayılıyor.' : ' Komisyon yine de saymak isterse "Sayıldı mı?" kutusunu işaretleyebilir.'}
              </Alert>
            )}
          </Paper>
        )
      })}
      <Button variant="outlined" disabled={disabled} onClick={() => onChange([...matches, emptyMatch()])}>
        + Eşleştirme satırı ekle
      </Button>
    </>
  )
}
