import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import ContentComparison from './ContentComparison'
import NoContentMark from './NoContentMark'
import {
  courseKey,
  emptyIncoming,
  emptyMatch,
  lacksContent,
  type DocumentSection,
  type EditIncoming,
  type EditMatch,
  type MatchView,
  type YalovaCourse,
} from './records'

type Props = {
  matches: EditMatch[]
  onChange: (matches: EditMatch[]) => void
  // Hesap sonucu (backend önizlemesi); satır sırası matches ile aynı.
  results: MatchView[]
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
 * Yalova dersleri seçilince: yeni seçilen dersin konuları plandaki içeriğinden gelir (A2). Daha önce konusu yazılmış
 * ders değişmez; komisyonun yazdığı ya da işaretlediği konular ezilmez. İçerik dersin içinde taşınmaz.
 */
function withPlanTopics(m: EditMatch, value: YalovaCourse[]): Partial<EditMatch> {
  const yalovaTopics = { ...m.yalovaTopics }
  for (const c of value) {
    const key = courseKey(c)
    if (!yalovaTopics[key] && c.content) yalovaTopics[key] = { text: c.content, covered: [] }
  }
  const yalova = value.map(({ code, name, credit, ects, language }) => ({ code, name, credit, ects, language }))
  return { yalova, yalovaTopics }
}

/**
 * Ders eşleştirme tablosu: her satırın solunda karşı kurumun ders(ler)i, sağında Yalova'nın ders(ler)i.
 * Solda birden çok ders = çoğa-bir, sağda birden çok ders = bire-çok. Notların Yalova karşılığı, birleşik not ve
 * satırın sorunları backend hesabından (results) gelir.
 */
export default function MatchTable({ matches, onChange, results, planCourses, sections, disabled }: Props) {
  const update = (key: number, change: Partial<EditMatch>) =>
    onChange(matches.map((m) => (m.key === key ? { ...m, ...change } : m)))

  const updateIncoming = (m: EditMatch, key: number, field: keyof EditIncoming, value: string) =>
    update(m.key, { incoming: m.incoming.map((c) => (c.key === key ? { ...c, [field]: value } : c)) })

  return (
    <>
      {matches.map((m, i) => {
        const r = results[i]
        // Önizlemeye sadece adı yazılmış dersler gider; Yalova karşılıklarını o derslere sırayla eşleriz.
        let named = 0
        const converted = m.incoming.map((c) => (c.name.trim() === '' ? null : r?.incoming[named++]?.convertedGrade))
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
                  Karşı kurumun dersi (birden çok ders birleştirilebilir)
                </Typography>
                {m.incoming.map((c, j) => {
                  // BL: önceki üniversitede alınıp oraya notsuz geçirilmiş ders. Bizde harf notu işlediği için gerçek
                  // harf öğrencinin önceki kaydının transkriptinden yazılır; ipucu satırın altında gösterilir.
                  const isBL = c.grade.trim().toLocaleUpperCase('tr') === 'BL'
                  return (
                    <Box key={c.key} sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField size="small" label="Ders adı" value={c.name} disabled={disabled}
                          onChange={(e) => updateIncoming(m, c.key, 'name', e.target.value)} sx={{ flex: 1, minWidth: 180 }} />
                        <TextField size="small" label="Kredi" value={c.credit} disabled={disabled}
                          onChange={(e) => updateIncoming(m, c.key, 'credit', e.target.value)} sx={{ width: 70 }} />
                        <TextField size="small" label="AKTS" value={c.ects} disabled={disabled}
                          onChange={(e) => updateIncoming(m, c.key, 'ects', e.target.value)} sx={{ width: 70 }} />
                        <TextField size="small" label="Not" value={c.grade} disabled={disabled} error={isBL}
                          onChange={(e) => updateIncoming(m, c.key, 'grade', e.target.value)} sx={{ width: 70 }} />
                        <TextField select size="small" label="Dil" value={c.language} disabled={disabled}
                          onChange={(e) => updateIncoming(m, c.key, 'language', e.target.value)} sx={{ width: 72 }}>
                          <MenuItem value="TR">TR</MenuItem>
                          <MenuItem value="EN">EN</MenuItem>
                        </TextField>
                        {/* Notun seçilen PT tablosuna göre Yalova karşılığı. */}
                        <Typography variant="body2" sx={{ width: 48 }}>
                          {converted[j] ? `→ ${converted[j]}` : ''}
                        </Typography>
                        {m.incoming.length > 1 && (
                          <IconButton size="small" aria-label="Karşı dersi çıkar" disabled={disabled}
                            onClick={() => update(m.key, { incoming: m.incoming.filter((x) => x.key !== c.key) })}>
                            <DeleteOutlined fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                      {isBL && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                          BL notsuzdur: gerçek harf notunu öğrencinin önceki kaydının transkriptinden yazın.
                        </Typography>
                      )}
                    </Box>
                  )
                })}
                <Button size="small" sx={{ mt: 1 }} disabled={disabled}
                  onClick={() => update(m.key, { incoming: [...m.incoming, emptyIncoming()] })}>
                  + Karşı ders ekle (çoğa-bir)
                </Button>
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

            <ContentComparison match={m} result={r} sections={sections} disabled={disabled} onChange={(change) => update(m.key, change)} />

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
