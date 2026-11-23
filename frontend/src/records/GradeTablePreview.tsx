import { useEffect, useState } from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { api } from '../api/client'
import GradeTableHead from '../grades/GradeTableHead'
import { GRADE_SYSTEMS, gridSx, sourceCells, twoDecimals, type GradeRow, type GradeSystem } from '../grades/gradeTable'

// Backend: GradeTableService.Detail.
type Detail = { id: number; code: string; name: string; system: GradeSystem; description: string | null; rows: GradeRow[] }

/**
 * İntibak formunda seçilen not dönüşüm tablosunun salt okunur görünümü (Ayarlar'daki tabloyla aynı biçim, EK-1
 * gibi). Akademisyen notların nasıl çevrildiğini başka bir sayfaya gitmeden kontrol edebilsin diye eşleştirme
 * tablosunun altında durur. Tabloyu değiştirmek Ayarlar > Not tabloları sayfasından yapılır (burada düzenleme yok,
 * yanlışlıkla değişmesin).
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

  return (
    <Accordion defaultExpanded variant="outlined" sx={{ mt: 2 }}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="subtitle2">
          Kullanılan not dönüşüm tablosu: {table.code} · {table.name}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {GRADE_SYSTEMS[table.system].description}
        </Typography>
        <Table size="small" sx={{ ...gridSx, width: 'auto' }}>
          <GradeTableHead system={table.system} />
          <TableBody>
            {table.rows.map((r, i) => (
              <TableRow key={i}>
                {sourceCells(table.system, r).map((text, j) => (
                  <TableCell key={j} align="center">
                    {text}
                  </TableCell>
                ))}
                <TableCell align="center">{r.targetLetter}</TableCell>
                <TableCell align="center">{twoDecimals(r.targetPoints)}</TableCell>
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
