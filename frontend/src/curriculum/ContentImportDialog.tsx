import { useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { api } from '../api/client'

// Backend: CurriculumService.ContentProposal. hasContent: dersin planda zaten içeriği var.
export type ContentProposal = { code: string; name: string; content: string; hasContent: boolean }

type Props = {
  planId: number
  open: boolean
  onClose: () => void
  // Seçilen önerileri plan tablosuna uygular (kalıcı olması için planın "Kaydet" düğmesi gerekir).
  onApply: (proposals: ContentProposal[]) => void
}

/**
 * Yalova ders içerik belgesi (A2): PDF/DOCX yüklenir, backend plandaki ders kodlarını belgede arar ve bulunan
 * içerikleri önerir. Kullanıcı önizlemede hangilerinin alınacağını seçer; içeriği zaten olan dersler varsayılan
 * olarak seçili gelmez (elle yazılmış içerik kendiliğinden ezilmesin).
 */
export default function ContentImportDialog({ planId, open, onClose, onApply }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [proposals, setProposals] = useState<ContentProposal[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function read(file: File) {
    setError(null)
    setLoading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const found = await api<ContentProposal[]>(`/api/plans/${planId}/content-document`, { method: 'POST', body: form })
      setProposals(found)
      setSelected(found.filter((p) => !p.hasContent).map((p) => p.code))
    } catch (e) {
      setProposals([])
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function close() {
    setProposals([])
    setSelected([])
    setError(null)
    onClose()
  }

  const toggle = (code: string, on: boolean) =>
    setSelected(on ? [...selected, code] : selected.filter((c) => c !== code))

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle>Ders içerik belgesi yükle</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Yalova'nın ders içerik belgesini (PDF ya da DOCX) seçin. Sistem plandaki her dersin kodunu (örn. BSM201)
          belgede arar; kodla başlayan bölümün satırlarını o dersin konuları olarak önerir. Taranmış (resim) PDF
          okunamaz. Eski Word (.doc) dosyasını önce DOCX olarak kaydedin.
        </Typography>
        {/* Gerçek dosya kutusu gizli; görünür düğme ona tıklar. */}
        <input ref={fileInput} type="file" accept=".pdf,.docx" hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void read(file)
            e.target.value = ''
          }} />
        <Button variant="outlined" disabled={loading} onClick={() => fileInput.current?.click()}>
          {loading ? 'Okunuyor...' : 'Dosya seç'}
        </Button>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {proposals.length > 0 && (
          <>
            <Typography variant="body2" sx={{ mt: 2 }}>
              {proposals.length} dersin içeriği bulundu. Alınacakları işaretleyin; içeriği zaten olan dersler
              işaretsiz gelir.
            </Typography>
            <Box sx={{ maxHeight: 420, overflowY: 'auto', mt: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Ders</TableCell>
                    <TableCell>Bulunan konular (ilk 3)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proposals.map((p) => {
                    const topics = p.content.split('\n')
                    return (
                      <TableRow key={p.code}>
                        <TableCell padding="checkbox">
                          <Checkbox checked={selected.includes(p.code)} onChange={(e) => toggle(p.code, e.target.checked)} />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {p.code} {p.name}
                          {p.hasContent && (
                            <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                              İçeriği var: seçerseniz değişir
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {topics.slice(0, 3).join(' · ')}
                            {topics.length > 3 && ` … (toplam ${topics.length} satır)`}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Vazgeç</Button>
        <Button variant="contained" disabled={selected.length === 0}
          onClick={() => {
            onApply(proposals.filter((p) => selected.includes(p.code)))
            close()
          }}>
          Seçilenleri uygula ({selected.length})
        </Button>
      </DialogActions>
    </Dialog>
  )
}
