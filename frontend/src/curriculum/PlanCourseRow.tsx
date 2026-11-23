import { Fragment, memo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight'

import { topicCount, topicsOf, type EditRow } from './planRow'

// Konular satırı tablodaki bütün sütunları kaplar (ok + 11 sütun + silme).
const COLUMN_COUNT = 13

type Props = {
  row: EditRow
  open: boolean
  onChange: (key: number, field: keyof EditRow, value: string) => void
  onToggle: (key: number) => void
  onEditContent: (row: EditRow) => void
  onDelete: (key: number) => void
}

/**
 * Plan tablosunda bir ders satırı (ve açıksa altındaki konular). memo: satırın verisi ya da açık/kapalı durumu
 * değişmedikçe yeniden çizilmez. Böylece bir kutuya harf yazınca 100 küsur satırın hepsi değil, sadece o satır
 * yeniden çizilir; seçmeli havuzu gibi kalabalık sekmelerde yazma gecikmesi kalkar. Bunun çalışması için sayfanın
 * verdiği fonksiyonlar (onChange vb.) her çizimde aynı kalmalı (PlansPage'de useCallback).
 */
function PlanCourseRow({ row: r, open, onChange, onToggle, onEditContent, onDelete }: Props) {
  return (
    // Fragment: ders satırı ve (açıksa) altındaki konular satırı birlikte döner.
    <Fragment>
      <TableRow>
        <TableCell padding="checkbox">
          {/* Ok: dersin konularını hemen altında açar/kapatır. */}
          <IconButton size="small" aria-label={open ? 'Konuları kapat' : 'Konuları aç'} onClick={() => onToggle(r.key)}>
            {open ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowRight fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell>
          <TextField
            select
            size="small"
            value={r.semester}
            onChange={(e) => onChange(r.key, 'semester', e.target.value)}
            sx={{ width: 90 }}
          >
            <MenuItem value="">Havuz</MenuItem>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <MenuItem key={s} value={String(s)}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </TableCell>
        <TableCell>
          <TextField
            size="small"
            value={r.groupName}
            onChange={(e) => onChange(r.key, 'groupName', e.target.value)}
            sx={{ width: 150 }}
          />
        </TableCell>
        <TableCell>
          <TextField
            size="small"
            value={r.code}
            placeholder="kod yok"
            onChange={(e) => onChange(r.key, 'code', e.target.value)}
            sx={{ width: 100 }}
          />
        </TableCell>
        <TableCell>
          <TextField
            size="small"
            value={r.name}
            onChange={(e) => onChange(r.key, 'name', e.target.value)}
            sx={{ minWidth: 240 }}
            fullWidth
          />
        </TableCell>
        <TableCell>
          <TextField
            select
            size="small"
            value={r.zs}
            onChange={(e) => onChange(r.key, 'zs', e.target.value)}
            sx={{ width: 64 }}
          >
            <MenuItem value="Z">Z</MenuItem>
            <MenuItem value="S">S</MenuItem>
          </TextField>
        </TableCell>
        <TableCell>
          <TextField
            select
            size="small"
            value={r.language}
            onChange={(e) => onChange(r.key, 'language', e.target.value)}
            sx={{ width: 72 }}
          >
            <MenuItem value="TR">TR</MenuItem>
            <MenuItem value="EN">EN</MenuItem>
          </TextField>
        </TableCell>
        {(['theory', 'practice', 'credit', 'ects'] as const).map((field) => (
          <TableCell key={field}>
            <TextField
              size="small"
              value={r[field]}
              onChange={(e) => onChange(r.key, field, e.target.value)}
              sx={{ width: 64 }}
            />
          </TableCell>
        ))}
        <TableCell>
          {/* Dersin içeriği (kural 5): formda bu ders seçilince konular kendiliğinden gelir. */}
          <Button size="small" sx={{ whiteSpace: 'nowrap' }} onClick={() => onEditContent(r)}>
            {topicCount(r.content) > 0 ? `${topicCount(r.content)} konu` : 'Ekle'}
          </Button>
        </TableCell>
        <TableCell>
          <IconButton size="small" aria-label="Dersi sil" onClick={() => onDelete(r.key)}>
            <DeleteOutlined fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>
      {open && (
        // Konular satırı: bütün sütunları kaplar, konular numaralı liste. Düzenleme "N konu" penceresinden.
        <TableRow sx={{ bgcolor: 'action.hover' }}>
          <TableCell colSpan={COLUMN_COUNT}>
            {topicCount(r.content) === 0 ? (
              <Typography variant="body2" color="text.secondary">
                İçerik girilmemiş.
              </Typography>
            ) : (
              <Box component="ol" sx={{ m: 0, pl: 4 }}>
                {topicsOf(r.content).map((topic, i) => (
                  <Typography component="li" variant="body2" key={i}>
                    {topic}
                  </Typography>
                ))}
              </Box>
            )}
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  )
}

export default memo(PlanCourseRow)
