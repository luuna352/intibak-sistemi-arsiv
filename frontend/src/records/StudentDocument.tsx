import { useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { api } from '../api/client'
import type { DocumentSection } from './records'

type Props = {
  sections: DocumentSection[]
  onChange: (sections: DocumentSection[]) => void
  disabled: boolean
}

/**
 * Öğrencinin ders içerik belgesi (A3): PDF/DOCX yüklenir, backend ders başlıklarına göre bölümlere ayırır. Dosya
 * sunucuda saklanmaz; bölümler sadece bu sayfa açıkken durur. Komisyon eşleştirme satırlarında "Belgede bul" ya da
 * listeden bölüm seçerek karşı dersin içeriğini doldurur; kayda sadece o içerik gider.
 */
export default function StudentDocument({ sections, onChange, disabled }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function read(file: File) {
    setError(null)
    setLoading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const result = await api<{ fileName: string; sections: DocumentSection[] }>('/api/content-documents', {
        method: 'POST',
        body: form,
      })
      setFileName(result.fileName)
      onChange(result.sections)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Ders başlığı (kodu) bulunan bölüm sayısı: kullanıcı bölmenin işe yarayıp yaramadığını görsün.
  const courseSections = sections.filter((s) => s.code !== null).length

  return (
    <Box sx={{ mb: 2 }}>
      {/* Gerçek dosya kutusu gizli; görünür düğme ona tıklar. */}
      <input ref={fileInput} type="file" accept=".pdf,.docx" hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void read(file)
          e.target.value = ''
        }} />
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="outlined" size="small" disabled={disabled || loading} onClick={() => fileInput.current?.click()}>
          {loading ? 'Okunuyor...' : 'Öğrencinin ders içerik belgesini yükle (PDF/DOCX)'}
        </Button>
        {fileName && sections.length > 0 && (
          <Typography variant="body2">
            {fileName}: {sections.length} bölüm ({courseSections} ders başlığı bulundu)
            <Button size="small" sx={{ ml: 1 }} disabled={disabled}
              onClick={() => {
                setFileName(null)
                onChange([])
              }}>
              Kaldır
            </Button>
          </Typography>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        Belge kaydedilmez; sadece eşleştirme satırlarında seçtiğiniz bölümler karşı dersin içeriğine kopyalanır.
        Sayfadan çıkınca belge tekrar yüklenmelidir.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  )
}
