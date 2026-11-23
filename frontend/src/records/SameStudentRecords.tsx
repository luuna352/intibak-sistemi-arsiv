import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { api } from '../api/client'
import { fileUrl, type Documents } from './documents'
import { statusColor, type RecordListItem } from './records'

// Diğer kayıt + transkripti yüklü mü (transkript bağlantısı sadece varsa gösterilir).
type Related = RecordListItem & { hasTranscript: boolean }

/**
 * Aynı öğrencinin (aynı TC) diğer kayıtları. Öğrenci birden çok yatay geçiş yaptıysa her önceki üniversite ayrı
 * kayıttır ve her kaydın kendi Word'ü olur. Örneğin 2. üniversitenin "BL" (notsuz) saydığı dersin gerçek harf notu
 * 1. üniversitenin transkriptindedir; komisyon onu buradan açar. TC 11 hane olunca sorulur.
 */
export default function SameStudentRecords({ tcNo, excludeId }: { tcNo: string; excludeId: number | null }) {
  const [related, setRelated] = useState<Related[]>([])
  const tc = tcNo.replace(/\s/g, '')

  useEffect(() => {
    if (tc.length !== 11) return
    // Yazarken her harfte sorulmasın diye yarım saniye beklenir.
    const timer = setTimeout(() => {
      const query = `/api/records/same-student?tc=${tc}${excludeId === null ? '' : `&excludeId=${excludeId}`}`
      api<RecordListItem[]>(query)
        .then((items) =>
          Promise.all(
            items.map((r) =>
              api<Documents>(`/api/records/${r.id}/documents`)
                .then((d) => ({ ...r, hasTranscript: d.documents.some((x) => x.kind === 'TRANSCRIPT') }))
                .catch(() => ({ ...r, hasTranscript: false })),
            ),
          ),
        )
        .then(setRelated)
        .catch(() => setRelated([]))
    }, 500)
    return () => clearTimeout(timer)
  }, [tc, excludeId])

  // TC eksikken eski sonuç gösterilmez.
  if (tc.length !== 11 || related.length === 0) return null

  return (
    <Alert severity="info" sx={{ mt: 2 }}>
      <Typography variant="subtitle2">Bu öğrencinin diğer kayıtları (aynı TC)</Typography>
      {related.map((r) => (
        <Box key={r.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
          <Typography variant="body2">
            {r.university ?? 'Üniversite yazılmamış'} · {r.transferTypeLabel} ·{' '}
            {new Date(r.createdAt).toLocaleDateString('tr-TR')}
          </Typography>
          <Chip size="small" label={r.statusLabel} color={statusColor[r.status]} />
          <Button size="small" href={`/kayitlar/${r.id}`} target="_blank" rel="noopener">
            Kaydı aç
          </Button>
          {r.hasTranscript && (
            <Button size="small" href={fileUrl(r.id, 'TRANSCRIPT')} target="_blank" rel="noopener">
              Transkripti aç
            </Button>
          )}
        </Box>
      ))}
      <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
        Her kayıt bir önceki üniversiteyle karşılaştırmadır ve ayrı Word çıktısı olur. "BL" gibi notsuz geçirilmiş
        dersin gerçek harf notu öğrencinin önceki kaydının transkriptinden alınır.
      </Typography>
    </Alert>
  )
}
