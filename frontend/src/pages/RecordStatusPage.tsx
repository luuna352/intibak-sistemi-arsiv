import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { api } from '../api/client'
import { statusColor, type RecordStatus } from '../records/records'

type StatusCount = { status: RecordStatus; label: string; count: number }

// Her durumun ne anlama geldiği (kayıt hangi işlemle o duruma geçer).
const MEANING: Record<RecordStatus, string> = {
  OLUSTURULUYOR: 'Kayıt yeni açıldı, henüz değiştirilmedi.',
  DEGISTIRILIYOR: 'Kayıt açıldıktan sonra en az bir kez değiştirildi (Word\'e aktarıldıktan sonra değişirse de bu duruma döner).',
  IPTAL: 'Kayıt iptal edildi; listede gizli, silinmedi. "İptali geri al" ile önceki durumuna döner.',
  WORDE_AKTARILDI: 'İntibak formu Word belgesi olarak alındı (Word çıktısı 7 Aralık aşamasında eklenecek).',
}

// Kayıt durumları: 4 durumun açıklaması ve her durumda kaç kayıt olduğu.
export default function RecordStatusPage() {
  const [counts, setCounts] = useState<StatusCount[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<StatusCount[]>('/api/records/status-counts')
      .then(setCounts)
      .catch((e: Error) => setError(e.message))
  }, [])

  return (
    <>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Kayıt durumları
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper sx={{ overflowX: 'auto', maxWidth: 820 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Durum</TableCell>
              <TableCell>Anlamı</TableCell>
              <TableCell align="right">Kayıt sayısı</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {counts.map((c) => (
              <TableRow key={c.status}>
                <TableCell>
                  <Chip size="small" label={c.label} color={statusColor[c.status]} />
                </TableCell>
                <TableCell>{MEANING[c.status]}</TableCell>
                <TableCell align="right">{c.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  )
}
