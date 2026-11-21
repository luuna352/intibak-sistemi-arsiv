import { useEffect, useState } from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { api } from '../api/client'

// Backend: GradeTableService.Detail / Row. Yalova puanı harften hesaplanıp gelir.
type Row = {
  sourceLetter: string | null
  sourceMin: number | null
  sourceMax: number | null
  targetLetter: string
  targetPoints: number
}
type Detail = { id: number; code: string; name: string; description: string | null; rows: Row[] }

/**
 * İntibak formunda seçilen not dönüşüm tablosunun salt okunur görünümü. Akademisyen notların nasıl çevrildiğini
 * başka bir sayfaya gitmeden kontrol edebilsin diye eşleştirme tablosunun altında durur. Tabloyu değiştirmek
 * Ayarlar > Not tabloları sayfasından yapılır (burada düzenleme yok, yanlışlıkla değişmesin).
 */
export default function GradeTablePreview({ gradeTableId }: { gradeTableId: string }) {
  const [table, setTable] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Seçim değişince yeni tablonun satırları yüklenir. setState sadece cevap gelince çağrılır (effect içinde
  // doğrudan çağırmak ESLint kuralına takılır; eski tablo cevap gelene kadar ekranda kalır).
  useEffect(() => {
    if (gradeTableId === '') return
    api<Detail>(`/api/grade-tables/${gradeTableId}`)
      .then((t) => {
        setTable(t)
        setError(null)
      })
      .catch((e: Error) => setError(e.message))
  }, [gradeTableId])

  // Tablo seçilmemişse gösterilecek bir şey yok.
  if (gradeTableId === '' || !table) {
    return error ? <Typography color="error">{error}</Typography> : null
  }

  // "90 - 100" gibi aralık metni; aralık yoksa boş.
  const range = (r: Row) => (r.sourceMin === null ? '' : `${r.sourceMin} - ${r.sourceMax}`)

  return (
    <Accordion defaultExpanded variant="outlined" sx={{ mt: 2 }}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="subtitle2">
          Kullanılan not dönüşüm tablosu: {table.code} · {table.name}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {table.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {table.description}
          </Typography>
        )}
        <Table size="small" sx={{ maxWidth: 620 }}>
          <TableHead>
            <TableRow>
              <TableCell>Karşı üniv. harf notu</TableCell>
              <TableCell>Karşı üniv. puan aralığı</TableCell>
              <TableCell>Yalova harf notu</TableCell>
              <TableCell>Yalova puanı</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {table.rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.sourceLetter ?? ''}</TableCell>
                <TableCell>{range(r)}</TableCell>
                <TableCell>{r.targetLetter}</TableCell>
                {/* 3.5 -> "3,50": Türkçe yazımla iki basamak. */}
                <TableCell>{Number(r.targetPoints).toFixed(2).replace('.', ',')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Öğrencinin notu bu tabloda yoksa satır sayılmaz; uygun tablo yoksa iş dekanlığa/manuel incelemeye
          aktarılmalıdır.
        </Typography>
      </AccordionDetails>
    </Accordion>
  )
}
