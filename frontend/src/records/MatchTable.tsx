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
import {
  emptyIncoming,
  emptyMatch,
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
export default function MatchTable({ matches, onChange, results, planCourses, disabled }: Props) {
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
              <Box sx={{ flex: 1 }} />
              <FormControlLabel
                label="Sayıldı mı?"
                control={
                  <Checkbox
                    checked={m.counted}
                    disabled={disabled}
                    onChange={(e) => update(m.key, { counted: e.target.checked })}
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
                {m.incoming.map((c, j) => (
                  <Box key={c.key} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
                    <TextField size="small" label="Ders adı" value={c.name} disabled={disabled}
                      onChange={(e) => updateIncoming(m, c.key, 'name', e.target.value)} sx={{ flex: 1, minWidth: 180 }} />
                    <TextField size="small" label="Kredi" value={c.credit} disabled={disabled}
                      onChange={(e) => updateIncoming(m, c.key, 'credit', e.target.value)} sx={{ width: 70 }} />
                    <TextField size="small" label="AKTS" value={c.ects} disabled={disabled}
                      onChange={(e) => updateIncoming(m, c.key, 'ects', e.target.value)} sx={{ width: 70 }} />
                    <TextField size="small" label="Not" value={c.grade} disabled={disabled}
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
                ))}
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
                  onChange={(_, value) => update(m.key, { yalova: value })}
                  noOptionsText="Planda ders yok (önce ders planı seçin)"
                  renderInput={(params) => <TextField {...params} placeholder="Kod ya da ad yazın" />}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>

            {r && r.problems.length > 0 && (
              <Alert severity={m.counted ? 'error' : 'warning'} sx={{ mt: 1 }}>
                {m.counted ? 'Bu satır bu haliyle sayılamaz: ' : ''}
                {r.problems.join(' ')}
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
