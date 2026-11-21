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
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import { api } from '../api/client'

// Backend'deki GradeTableService kayıtlarıyla aynı alanlar.
type Summary = { id: number; code: string; name: string; rowCount: number }
type Row = {
  sourceLetter: string | null
  sourceMin: number | null
  sourceMax: number | null
  targetLetter: string
  targetPoints: number
}
type Detail = {
  id: number
  code: string
  name: string
  description: string | null
  createdByName: string
  createdAt: string
  updatedByName: string | null
  updatedAt: string | null
  rows: Row[]
}
type YalovaGrade = { letter: string; points: number }

// Ekranda düzenlenen satır: kutular metin tutar, kaydederken sayıya çevrilir.
type EditRow = { sourceLetter: string; sourceMin: string; sourceMax: string; targetLetter: string }

const toEdit = (r: Row): EditRow => ({
  sourceLetter: r.sourceLetter ?? '',
  sourceMin: r.sourceMin?.toString() ?? '',
  sourceMax: r.sourceMax?.toString() ?? '',
  targetLetter: r.targetLetter,
})

// "85,5" gibi Türkçe virgüllü yazımı da kabul eder; boş kutu = değer yok (null).
const toNumber = (s: string): number | null => (s.trim() === '' ? null : Number(s.replace(',', '.')))

// Ayarlar > Not dönüşüm tabloları (mockup: ekran 6).
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

  // Seçili tablonun bilgisini ekrana koyar (ad kutusu + düzenlenebilir satırlar).
  function show(d: Detail) {
    setDetail(d)
    setName(d.name)
    setRows(d.rows.map(toEdit))
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

  const pointsOf = (letter: string) => grades.find((g) => g.letter === letter)?.points.toFixed(2) ?? ''

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
        body: {
          name,
          rows: rows.map((r) => ({
            sourceLetter: r.sourceLetter.trim() || null,
            sourceMin: toNumber(r.sourceMin),
            sourceMax: toNumber(r.sourceMax),
            targetLetter: r.targetLetter || null,
          })),
        },
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
      const created = await api<Detail>('/api/grade-tables', { method: 'POST', body: { name: newName } })
      setNewOpen(false)
      setNewName('')
      await reloadList()
      setSelectedId(created.id)
      // Yeni tablo boş gelir; doldurmaya başlamak için bir boş satır eklenir.
      show({ ...created })
      setRows([{ sourceLetter: '', sourceMin: '', sourceMax: '', targetLetter: '' }])
      setMessage({ type: 'success', text: `${created.code} açıldı. Satırları doldurup Kaydet'e basın.` })
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
    }
  }

  return (
    <>
      <Typography variant="h5">Ayarlar · Not dönüşüm tabloları</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        PT1, PT2, PT3 hazır gelir. Standart dışı bir not sistemi için yeni tablo eklenir; değerler dekanlık/senato
        kararlarına bakılarak elle girilir.
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
          {detail.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {detail.description}
            </Typography>
          )}

          <Paper sx={{ overflowX: 'auto', mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Karşı üniv. harf notu</TableCell>
                  <TableCell>Karşı üniv. puan aralığı</TableCell>
                  <TableCell>Yalova harf notu</TableCell>
                  <TableCell>Yalova puanı</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <TextField
                        size="small"
                        value={r.sourceLetter}
                        onChange={(e) => updateRow(i, 'sourceLetter', e.target.value)}
                        sx={{ width: 110 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          size="small"
                          value={r.sourceMin}
                          onChange={(e) => updateRow(i, 'sourceMin', e.target.value)}
                          sx={{ width: 80 }}
                        />
                        -
                        <TextField
                          size="small"
                          value={r.sourceMax}
                          onChange={(e) => updateRow(i, 'sourceMax', e.target.value)}
                          sx={{ width: 80 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
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
                    {/* Puan girilmez: seçilen Yalova harfinden gelir (AA = 4.00 ...). */}
                    <TableCell>{pointsOf(r.targetLetter)}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        aria-label="Satırı sil"
                        onClick={() => setRows(rows.filter((_, j) => j !== i))}
                      >
                        <DeleteOutlined fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setRows([...rows, { sourceLetter: '', sourceMin: '', sourceMax: '', targetLetter: '' }])}
            >
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
        Her satırda karşı üniversitenin harf notu ya da puan aralığı (ya da ikisi) bulunur. Puan aralıkları üst üste
        binemez. Puan aralığında belirsizlik varsa öğrenci lehine en yüksek karşılık seçilir.
      </Typography>

      <Dialog open={newOpen} onClose={() => setNewOpen(false)}>
        <DialogTitle>Yeni puan tablosu</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Tablo adı (örn. 10'luk not sistemi)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 1 }}
          />
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
