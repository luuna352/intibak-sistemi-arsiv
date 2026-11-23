import { useEffect, useState } from 'react'
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
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import { api } from '../api/client'
import GradeTableHead from '../grades/GradeTableHead'
import {
  GRADE_SYSTEMS,
  SYSTEM_OPTIONS,
  emptyEditRow,
  gridSx,
  toEditRow,
  toRowInput,
  twoDecimals,
  type EditRow,
  type GradeRow,
  type GradeSystem,
} from '../grades/gradeTable'

// Backend'deki GradeTableService kayıtlarıyla aynı alanlar.
type Summary = { id: number; code: string; name: string; system: GradeSystem; rowCount: number }
type Detail = {
  id: number
  code: string
  name: string
  system: GradeSystem
  description: string | null
  createdByName: string
  createdAt: string
  updatedByName: string | null
  updatedAt: string | null
  rows: GradeRow[]
}
type YalovaGrade = { letter: string; points: number }

// Ayarlar > Not dönüşüm tabloları (mockup: ekran 6). Tablolar Senato İntibak Esasları EK-1'deki gibi görünür:
// her tablo sadece kendi not sisteminin sütunlarını gösterir. Burada sadece kaydedilir; intibak formunda seçilen
// tablo öğrencinin notunu Yalova notuna çevirmek için kullanılır.
export default function GradeTablesPage() {
  const [tables, setTables] = useState<Summary[]>([])
  const [grades, setGrades] = useState<YalovaGrade[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [name, setName] = useState('')
  const [rows, setRows] = useState<EditRow[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSystem, setNewSystem] = useState<GradeSystem | ''>('')

  // Seçili tablonun bilgisini ekrana koyar (ad kutusu + düzenlenebilir satırlar).
  function show(d: Detail) {
    setDetail(d)
    setName(d.name)
    setRows(d.rows.map((r) => toEditRow(d.system, r)))
  }

  // Açılışta: tablo listesi ve Yalova harf notları; ilk tablo seçilir.
  useEffect(() => {
    Promise.all([api<Summary[]>('/api/grade-tables'), api<YalovaGrade[]>('/api/grade-tables/yalova-grades')])
      .then(([list, yalova]) => {
        setTables(list)
        setGrades(yalova)
        if (list.length > 0) setSelectedId(list[0].id)
      })
      .catch((e: Error) => setMessage({ type: 'error', text: e.message }))
  }, [])

  // Seçim değişince o tablonun satırları yüklenir.
  useEffect(() => {
    if (selectedId === null) return
    api<Detail>(`/api/grade-tables/${selectedId}`)
      .then(show)
      .catch((e: Error) => setMessage({ type: 'error', text: e.message }))
  }, [selectedId])

  const pointsOf = (letter: string) => {
    const g = grades.find((x) => x.letter === letter)
    return g ? twoDecimals(g.points) : ''
  }

  function updateRow(index: number, field: keyof EditRow, value: string) {
    setRows(rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  async function reloadList() {
    setTables(await api<Summary[]>('/api/grade-tables'))
  }

  async function save() {
    if (!detail) return
    setMessage(null)
    try {
      const saved = await api<Detail>(`/api/grade-tables/${detail.id}`, {
        method: 'PUT',
        body: { name, rows: rows.map((r) => toRowInput(detail.system, r)) },
      })
      show(saved)
      await reloadList()
      setMessage({ type: 'success', text: `${saved.code} kaydedildi.` })
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
    }
  }

  async function createTable() {
    setMessage(null)
    try {
      const created = await api<Detail>('/api/grade-tables', {
        method: 'POST',
        body: { name: newName, system: newSystem || null },
      })
      setNewOpen(false)
      setNewName('')
      setNewSystem('')
      await reloadList()
      setSelectedId(created.id)
      // Yeni tablo boş gelir; doldurmaya başlamak için bir boş satır eklenir.
      show(created)
      setRows([emptyEditRow()])
      setMessage({ type: 'success', text: `${created.code} açıldı. Satırları doldurup Kaydet'e basın.` })
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
    }
  }

  // "Diğer üniversite" hücreleri: tablonun not sistemine göre bir ya da iki kutu.
  function sourceInputs(system: GradeSystem, r: EditRow, i: number) {
    if (system === 'SCORE') {
      return (
        <TableCell align="center">
          <TextField size="small" value={r.source} placeholder="90-100 ya da DEVAMSIZ"
            onChange={(e) => updateRow(i, 'source', e.target.value)} sx={{ width: 200 }} />
        </TableCell>
      )
    }
    return (
      <>
        <TableCell align="center">
          <TextField size="small" value={r.source} placeholder={system === 'LETTER' ? 'A1' : 'A-'}
            onChange={(e) => updateRow(i, 'source', e.target.value)} sx={{ width: 110 }} />
        </TableCell>
        {system === 'LETTER_NUMBER' && (
          <TableCell align="center">
            <TextField size="small" value={r.number} placeholder="3.70"
              onChange={(e) => updateRow(i, 'number', e.target.value)} sx={{ width: 100 }} />
          </TableCell>
        )}
      </>
    )
  }

  return (
    <>
      <Typography variant="h5">AYARLAR · Not Dönüşüm Tabloları</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        PT1, PT2, PT3 Senato İntibak Esasları EK-1'deki üç tablodur. Burada sadece kaydedilir; intibak formunda seçilen
        tablo öğrencinin notunu Yalova notuna çevirir. Başka bir not sistemi çıkarsa yeni tablo eklenir; değerler
        dekanlık/senato kararlarına bakılarak elle girilir.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField
          select
          size="small"
          label="Tablo"
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          sx={{ minWidth: 300 }}
        >
          {tables.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.code} · {t.name}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" onClick={() => setNewOpen(true)}>
          + Yeni Puan Tablosu Ekle
        </Button>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {detail && (
        <>
          <TextField
            label={`${detail.code} adı`}
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 1, minWidth: 360 }}
          />
          {/* Not sistemi tablo açılırken seçilir; sütunlar ve satır kuralları buna göredir. */}
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <b>Not sistemi:</b> {GRADE_SYSTEMS[detail.system].label}. {GRADE_SYSTEMS[detail.system].description}
          </Typography>
          {detail.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Kaynak: {detail.description}
            </Typography>
          )}

          <Paper sx={{ overflowX: 'auto', mb: 2, display: 'inline-block', maxWidth: '100%' }}>
            <Table size="small" sx={gridSx}>
              <GradeTableHead system={detail.system} withAction />
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    {sourceInputs(detail.system, r, i)}
                    <TableCell align="center">
                      <TextField
                        select
                        size="small"
                        value={r.targetLetter}
                        onChange={(e) => updateRow(i, 'targetLetter', e.target.value)}
                        sx={{ width: 100 }}
                      >
                        {grades.map((g) => (
                          <MenuItem key={g.letter} value={g.letter}>
                            {g.letter}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    {/* Sayı girilmez: seçilen Yalova harfinden gelir (AA = 4.00 ...). */}
                    <TableCell align="center" sx={{ minWidth: 70 }}>
                      {pointsOf(r.targetLetter)}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" aria-label="Satırı sil" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
            <Button variant="outlined" onClick={() => setRows([...rows, emptyEditRow()])}>
              + Satır ekle
            </Button>
            <Button variant="contained" onClick={save}>
              Kaydet
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Oluşturan: {detail.createdByName}
            {detail.updatedByName &&
              detail.updatedAt &&
              ` · Son değiştiren: ${detail.updatedByName} · ${new Date(detail.updatedAt).toLocaleString('tr-TR')}`}
          </Typography>
        </>
      )}

      <Alert severity="warning" sx={{ mb: 1 }}>
        Not eşleştirmeyi kişisel takdirle yapmak hukuki sorumluluk doğurur. Tablolar dekanlık/fakülte kurulu ve senato
        esaslarına tam uygun olmalıdır.
      </Alert>
      <Typography variant="body2" color="text.secondary">
        Puan aralıkları üst üste binemez. Puan iki aralığın arasında kalırsa öğrenci lehine üstteki aralığın notu
        verilir. Hiçbir tablo uymuyorsa iş dekanlığa/manuel incelemeye aktarılır.
      </Typography>

      <Dialog open={newOpen} onClose={() => setNewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Yeni puan tablosu</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Tablo adı (örn. 10'luk not sistemi)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          {/* Tablonun sütunları bu seçime göre olur; sonradan değiştirilemez. */}
          <TextField
            select
            fullWidth
            label="Karşı üniversitenin not sistemi"
            value={newSystem}
            onChange={(e) => setNewSystem(e.target.value as GradeSystem)}
            helperText={newSystem ? GRADE_SYSTEMS[newSystem].description : 'Tablonun sütunları buna göre belirlenir.'}
          >
            {SYSTEM_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewOpen(false)}>Vazgeç</Button>
          <Button variant="contained" onClick={createTable}>
            Oluştur
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
