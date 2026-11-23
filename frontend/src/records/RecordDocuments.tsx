import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Typography from '@mui/material/Typography'
import { api } from '../api/client'
import {
  KIND_LABEL,
  fileUrl,
  formatSize,
  readSections,
  setContentInTranscript,
  storedSections,
  uploadDocument,
  type DocumentKind,
  type Documents,
  type PendingDocuments,
} from './documents'
import type { DocumentSection } from './records'

type Props = {
  // Kaydedilmiş kaydın numarası; yeni kayıtta null (dosyalar "Kaydet"e kadar bekler).
  recordId: number | null
  pending: PendingDocuments
  onPendingChange: (pending: PendingDocuments) => void
  // "Belgede bul" için öğrencinin ders içeriklerinin bölümleri (içerik belgesinden ya da transkriptten).
  onSections: (sections: DocumentSection[]) => void
  disabled: boolean
}

/**
 * Formdaki "Belgeler" bölümü: her kayıtta bir transkript ve bir ders içerik belgesi (PDF/DOCX, en fazla 30 MB).
 * Dosyalar sadece bu sistemin veritabanında saklanır; aynı türden yenisi yüklenince eskisinin yerine geçer.
 * İçerikler transkriptin içindeyse kutu işaretlenir, ayrı içerik belgesi istenmez ve "Belgede bul" transkriptte arar.
 * Yeni kayıtta seçilen dosyalar hemen okunur (bölümler eşleştirmede kullanılabilsin) ama "Kaydet" ile kayıt
 * oluşunca saklanır.
 */
export default function RecordDocuments({ recordId, pending, onPendingChange, onSections, disabled }: Props) {
  const transcriptInput = useRef<HTMLInputElement>(null)
  const contentInput = useRef<HTMLInputElement>(null)
  const [docs, setDocs] = useState<Documents | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Belgenin okunma sonucu: kaç bölüm bulundu ya da neden okunamadı (taranmış PDF gibi).
  const [readInfo, setReadInfo] = useState<{ ok: boolean; text: string } | null>(null)

  // Bölümler bulunduğunda kullanıcıya özet; okunamazsa uyarı (dosya yine de saklanmış olur).
  function showSections(sections: DocumentSection[]) {
    onSections(sections)
    const courses = sections.filter((s) => s.code !== null).length
    setReadInfo({ ok: true, text: `İçerik kaynağında ${sections.length} bölüm, ${courses} ders başlığı bulundu.` })
  }
  function sectionsFailed(e: Error) {
    onSections([])
    setReadInfo({ ok: false, text: `İçerik okunamadı: ${e.message}` })
  }

  // Backend'den gelen belge listesi gösterilir ve içerik kaynağının (içerik belgesi ya da transkript) bölümleri
  // okunur. Kaynak dosya yüklenmemişse "Belgede bul" boş kalır.
  async function applyStored(id: number, d: Documents) {
    setDocs(d)
    const source: DocumentKind = d.contentInTranscript ? 'TRANSCRIPT' : 'CONTENT'
    if (!d.documents.some((x) => x.kind === source)) {
      onSections([])
      setReadInfo(null)
      return
    }
    await storedSections(id).then(showSections).catch(sectionsFailed)
  }

  const loadStored = async (id: number) => applyStored(id, await api<Documents>(`/api/records/${id}/documents`))

  // Kayıt açılınca (ya da yeni kayıt kaydedilip numara alınca) belgeler yüklenir. State sadece cevap gelince
  // (then içinde) değişir; effect içinde doğrudan setState ESLint kuralına takılır.
  useEffect(() => {
    if (recordId === null) return
    api<Documents>(`/api/records/${recordId}/documents`)
      .then((d) => applyStored(recordId, d))
      .catch((e: Error) => setError(e.message))
    // applyStored her çizimde yeni fonksiyon; sadece kayıt değişince çalışsın.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId])

  // Yeni kayıtta içerik kaynağı (ayrı belge ya da transkript) değişince bölümler o dosyadan okunur.
  function readPendingSource(next: PendingDocuments) {
    const source = next.contentInTranscript ? next.transcript : next.content
    if (!source) {
      onSections([])
      setReadInfo(null)
      return
    }
    readSections(source).then(showSections).catch(sectionsFailed)
  }

  async function choose(kind: DocumentKind, file: File) {
    setError(null)
    if (recordId === null) {
      const next = kind === 'TRANSCRIPT' ? { ...pending, transcript: file } : { ...pending, content: file }
      onPendingChange(next)
      readPendingSource(next)
      return
    }
    setBusy(true)
    try {
      await uploadDocument(recordId, kind, file)
      await loadStored(recordId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function toggleInTranscript(value: boolean) {
    setError(null)
    if (recordId === null) {
      const next = { ...pending, contentInTranscript: value, content: value ? null : pending.content }
      onPendingChange(next)
      readPendingSource(next)
      return
    }
    // Ayrı yüklenmiş içerik belgesi varsa kaldırılacağı söylenir (aynı içerik iki yerde durmaz).
    if (value && docs?.documents.some((d) => d.kind === 'CONTENT')
      && !window.confirm('Ayrı yüklenen ders içerik belgesi kaldırılacak; içerikler transkriptten okunacak. Devam edilsin mi?')) {
      return
    }
    setBusy(true)
    try {
      await setContentInTranscript(recordId, value)
      await loadStored(recordId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const inTranscript = recordId === null ? pending.contentInTranscript : (docs?.contentInTranscript ?? false)

  // Bir belgenin satırı: dosya bilgisi + Aç + Yükle/Değiştir.
  function slot(kind: DocumentKind) {
    const stored = docs?.documents.find((d) => d.kind === kind)
    const waiting = recordId === null ? (kind === 'TRANSCRIPT' ? pending.transcript : pending.content) : null
    const input = kind === 'TRANSCRIPT' ? transcriptInput : contentInput
    return (
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', py: 0.5 }}>
        <Typography sx={{ width: 170, fontWeight: 600 }}>{KIND_LABEL[kind]}</Typography>
        {stored && (
          <Typography variant="body2">
            {stored.fileName} · {formatSize(stored.sizeBytes)} · {stored.uploadedByName} ·{' '}
            {new Date(stored.uploadedAt).toLocaleString('tr-TR')}
            {recordId !== null && (
              <Button size="small" href={fileUrl(recordId, kind)} target="_blank" rel="noopener" sx={{ ml: 1 }}>
                Aç
              </Button>
            )}
          </Typography>
        )}
        {waiting && (
          <Typography variant="body2">
            {waiting.name} · {formatSize(waiting.size)} · "Kaydet" ile saklanacak
          </Typography>
        )}
        {!stored && !waiting && (
          <Typography variant="body2" color="text.secondary">
            Yüklenmedi
          </Typography>
        )}
        {/* Gerçek dosya kutusu gizli; görünür düğme ona tıklar. */}
        <input ref={input} type="file" accept=".pdf,.docx" hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void choose(kind, file)
            e.target.value = ''
          }} />
        <Button variant="outlined" size="small" disabled={disabled || busy} onClick={() => input.current?.click()}>
          {stored || waiting ? 'Değiştir' : 'Yükle'}
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ mb: 1 }}>
      {slot('TRANSCRIPT')}
      <FormControlLabel sx={{ ml: 0 }}
        control={<Checkbox size="small" checked={inTranscript} disabled={disabled || busy}
          onChange={(e) => void toggleInTranscript(e.target.checked)} />}
        label="Ders içerikleri transkriptin içinde (ayrı içerik belgesi yok)" />
      {!inTranscript && slot('CONTENT')}
      {readInfo && (
        <Typography variant="body2" color={readInfo.ok ? 'text.secondary' : 'warning.main'} sx={{ mt: 0.5 }}>
          {readInfo.text}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        PDF ya da DOCX, en fazla 30 MB. Belgeler sadece bu sistemde saklanır, dışarı gönderilmez. Taranmış (resim) PDF
        saklanır ve açılabilir ama içindeki yazı okunamaz; o zaman dersin içeriği eşleştirmede elle yazılır.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  )
}
