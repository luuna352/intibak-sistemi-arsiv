import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { GRADE_SYSTEMS, type GradeSystem } from './gradeTable'

/**
 * EK-1'deki gibi iki katlı başlık: üstte "Diğer üniversite not sistemi" ve "YÜ not karşılığı", altta sütun adları.
 * Soldaki sütunlar tablonun not sistemine göre değişir (100'lü not / harf ve sayı / harf). withAction: düzenleme
 * ekranında en sağda silme düğmesi sütunu.
 */
export default function GradeTableHead({ system, withAction = false }: { system: GradeSystem; withAction?: boolean }) {
  const columns = GRADE_SYSTEMS[system].columns
  return (
    <TableHead>
      <TableRow>
        <TableCell colSpan={columns.length} align="center" sx={{ fontWeight: 700 }}>
          Diğer üniversite not sistemi
        </TableCell>
        <TableCell colSpan={2} align="center" sx={{ fontWeight: 700 }}>
          YÜ not karşılığı
        </TableCell>
        {withAction && <TableCell rowSpan={2} />}
      </TableRow>
      <TableRow>
        {columns.map((c) => (
          <TableCell key={c} align="center" sx={{ fontWeight: 700 }}>
            {c}
          </TableCell>
        ))}
        <TableCell align="center" sx={{ fontWeight: 700 }}>
          Harf
        </TableCell>
        <TableCell align="center" sx={{ fontWeight: 700 }}>
          Sayı
        </TableCell>
      </TableRow>
    </TableHead>
  )
}
