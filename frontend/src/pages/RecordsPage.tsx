import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { api } from '../api/client'
import { useActiveYear } from '../settings/activeYear'
import {
  formatDate,
  statusColor,
  statusMeaning,
  type RecordListItem,
  type RecordStatus,
  type StatusCount,
} from '../records/records'

// Sıralanabilir sütunlar: başlık metni ve satırdaki alan.
type SortKey = 'tcMasked' | 'fullName' | 'transferTypeLabel' | 'university' | 'createdByName' | 'createdAt'
  | 'updatedByName' | 'updatedAt' | 'statusLabel'
const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'tcMasked', label: 'TC' },
  { key: 'fullName', label: 'Ad-Soyad' },
  { key: 'transferTypeLabel', label: 'Geçiş türü' },
  { key: 'university', label: 'Geldiği üniversite' },
  { key: 'createdByName', label: 'Kaydı açan' },
  { key: 'createdAt', label: 'Kayıt tarihi' },
  { key: 'updatedByName', label: 'Son değiştiren' },
  { key: 'updatedAt', label: 'Değiştirilme' },
  { key: 'statusLabel', label: 'Durum' },
]
const DATE_KEYS: SortKey[] = ['createdAt', 'updatedAt']

// İntibak kayıtları listesi (mockup: ekran 2). Başlığa tıklayınca sıralanır, satıra çift tıklayınca kayıt açılır.
export default function RecordsPage() {
  const navigate = useNavigate()
  const { activeYear } = useActiveYear()
  const [records, setRecords] = useState<RecordListItem[]>([])
  const [query, setQuery] = useState('')
  const [showCancelled, setShowCancelled] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'createdAt', asc: false })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [toCancel, setToCancel] = useState<RecordListItem | null>(null)
  // Listeyi yeniden yükletmek için sayaç: iptal/geri al sonrası artırılır, effect tekrar çalışır.
  const [reload, setReload] = useState(0)
  // Durum sayıları (listenin üstündeki düğmeler) ve seçili durum filtresi (null = hepsi).
  const [counts, setCounts] = useState<StatusCount[]>([])
  const [statusFilter, setStatusFilter] = useState<RecordStatus | null>(null)
  // İptal durumu seçilince iptal edilenler de istenir (normalde listede gizli).
  const includeCancelled = showCancelled || statusFilter === 'IPTAL'

  // Arama kutusu, "iptal edilenleri göster" ya da filtre değişince liste backend'den yeniden istenir.
  useEffect(() => {
    const params = new URLSearchParams({ q: query, includeCancelled: String(includeCancelled) })
    api<RecordListItem[]>(`/api/records?${params}`)
      .then(setRecords)
      .catch((e: Error) => setMessage({ type: 'error', text: e.message }))
  }, [query, includeCancelled, reload])

  // Sayılar da iptal/geri al sonrası yenilenir (bir kayıt durum değiştirmiş olur).
  useEffect(() => {
    api<StatusCount[]>('/api/records/status-counts')
      .then(setCounts)
      .catch((e: Error) => setMessage({ type: 'error', text: e.message }))
  }, [reload])

  function sortBy(key: SortKey) {
    // Aynı başlığa tekrar tıklanınca yön değişir (A-Z <-> Z-A).
    setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }))
  }

  // Türkçe alfabeye göre karşılaştırma (Ç, Ğ, İ, Ö, Ş, Ü doğru yerde); boş değerler sona.
  const sorted = records.filter((r) => statusFilter === null || r.status === statusFilter).sort((a, b) => {
    const x = a[sort.key] ?? ''
    const y = b[sort.key] ?? ''
    if (x === '' || y === '') return x === y ? 0 : x === '' ? 1 : -1
    const result = DATE_KEYS.includes(sort.key) ? x.localeCompare(y) : x.localeCompare(y, 'tr')
    return sort.asc ? result : -result
  })

  async function changeStatus(record: RecordListItem, action: 'cancel' | 'restore') {
    setMessage(null)
    try {
      await api(`/api/records/${record.id}/${action}`, { method: 'POST' })
      setMessage({
        type: 'success',
        text: action === 'cancel' ? `${record.fullName} kaydı iptal edildi.` : `${record.fullName} kaydının iptali geri alındı.`,
      })
      setReload((n) => n + 1)
    } catch (e) {
      setMessage({ type: 'error', text: (e as Error).message })
    }
  }

  return (
    <>
      <Typography variant="h5">İntibak kayıtları</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Aktif yıl: <b>{activeYear?.label}</b>
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <Button variant="contained" onClick={() => navigate('/yeni-form')}>
          + Yeni kayıt
        </Button>
        <TextField
          size="small"
          placeholder="Ara (TC, ad-soyad)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ width: 240 }}
        />
        <FormControlLabel
          control={<Checkbox checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />}
          label="İptal edilenleri göster"
        />
      </Box>

      {/* Durum düğmeleri: tıklanınca liste o duruma süzülür, tekrar tıklanınca (ya da "Hepsi") süzme kalkar.
          Üzerine gelince durumun anlamı görünür. Sayılar bütün kayıtlardır (aramadan bağımsız). */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <Chip label="Hepsi" variant={statusFilter === null ? 'filled' : 'outlined'} onClick={() => setStatusFilter(null)} />
        {counts.map((c) => (
          <Tooltip key={c.status} title={statusMeaning[c.status]}>
            <Chip
              label={`${c.label} (${c.count})`}
              color={statusColor[c.status]}
              variant={statusFilter === c.status ? 'filled' : 'outlined'}
              onClick={() => setStatusFilter(statusFilter === c.status ? null : c.status)}
            />
          </Tooltip>
        ))}
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Paper sx={{ overflowX: 'auto', mb: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {COLUMNS.map((c) => (
                <TableCell key={c.key} sx={{ whiteSpace: 'nowrap' }}>
                  <TableSortLabel
                    active={sort.key === c.key}
                    direction={sort.key === c.key && !sort.asc ? 'desc' : 'asc'}
                    onClick={() => sortBy(c.key)}
                  >
                    {c.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((r) => (
              <TableRow
                key={r.id}
                hover
                onDoubleClick={() => navigate(`/kayitlar/${r.id}`)}
                sx={{ cursor: 'pointer', '& td': r.status === 'IPTAL' ? { color: 'text.disabled' } : {} }}
              >
                <TableCell>{r.tcMasked}</TableCell>
                <TableCell>{r.fullName}</TableCell>
                <TableCell>{r.transferTypeLabel}</TableCell>
                <TableCell>{r.university}</TableCell>
                <TableCell>{r.createdByName}</TableCell>
                <TableCell>{formatDate(r.createdAt)}</TableCell>
                <TableCell>{r.updatedByName}</TableCell>
                <TableCell>{formatDate(r.updatedAt)}</TableCell>
                <TableCell>
                  <Tooltip title={statusMeaning[r.status]}>
                    <Chip size="small" label={r.statusLabel} color={statusColor[r.status]} />
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {r.status === 'IPTAL' ? (
                    <Button size="small" onClick={() => changeStatus(r, 'restore')} sx={{ whiteSpace: 'nowrap' }}>
                      İptali geri al
                    </Button>
                  ) : (
                    <Button size="small" color="error" onClick={() => setToCancel(r)} sx={{ whiteSpace: 'nowrap' }}>
                      İptal et
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMNS.length + 1} sx={{ color: 'text.secondary' }}>
                  {query || statusFilter ? 'Aramaya/filtreye uyan kayıt yok.' : 'Henüz kayıt yok. "+ Yeni kayıt" ile ekleyin.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
      <Typography variant="body2" color="text.secondary">
        Sütun başlığına tıkla: sırala · Satıra çift tıkla: kaydı aç · Durum düğmesine tıkla: o durumdaki kayıtlar
        (üzerine gelince durumun anlamı görünür). "Kaydı açan" ve "Son değiştiren" işlemi yapanın o
        andaki adıdır; sonradan rolün adı değişse de eski kayıtlar değişmez. Kayıt silinmez: "İptal et" listeden gizler,
        "İptali geri al" geri getirir.
      </Typography>

      {/* İptal onayı: yanlışlıkla tıklamaya karşı. */}
      <Dialog open={toCancel !== null} onClose={() => setToCancel(null)}>
        <DialogTitle>Kayıt iptal edilsin mi?</DialogTitle>
        <DialogContent>
          {toCancel?.fullName} kaydı listeden gizlenir. Silinmez; "İptal edilenleri göster" ile bulunup geri alınabilir.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToCancel(null)}>Vazgeç</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (toCancel) changeStatus(toCancel, 'cancel')
              setToCancel(null)
            }}
          >
            İptal et
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
