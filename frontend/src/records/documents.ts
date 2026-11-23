// İntibak kaydının belgeleri (transkript ve ders içerik belgesi): tipler ve backend çağrıları.
// Backend: RecordDocumentController (/api/records/{id}/documents).
import { api } from '../api/client'
import type { DocumentSection } from './records'

export type DocumentKind = 'TRANSCRIPT' | 'CONTENT'

export const KIND_LABEL: Record<DocumentKind, string> = {
  TRANSCRIPT: 'Transkript',
  CONTENT: 'Ders içerik belgesi',
}

// Backend DocumentSummary: dosyanın kendisi gelmez, sadece özeti.
export type DocumentSummary = {
  kind: DocumentKind
  fileName: string
  sizeBytes: number
  uploadedByName: string
  uploadedAt: string
}

export type Documents = { contentInTranscript: boolean; documents: DocumentSummary[] }

// Yeni kayıtta (henüz kaydedilmemiş) seçilen dosyalar: "Kaydet" ile kayıt oluşunca yüklenir.
export type PendingDocuments = { transcript: File | null; content: File | null; contentInTranscript: boolean }

export const EMPTY_PENDING: PendingDocuments = { transcript: null, content: null, contentInTranscript: false }

// Dosyayı tarayıcıda açma adresi (PDF yeni sekmede açılır, DOCX indirilir). Session cookie'si kendiliğinden gider.
export const fileUrl = (recordId: number, kind: DocumentKind) => `/api/records/${recordId}/documents/${kind}/file`

// 1536000 -> "1,5 MB" (kullanıcı dosyanın büyüklüğünü görsün).
export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} MB`
}

/** Kaydın bir belgesini yükler (aynı türden varsa yerine geçer). */
export function uploadDocument(recordId: number, kind: DocumentKind, file: File) {
  const form = new FormData()
  form.append('file', file)
  return api<Documents>(`/api/records/${recordId}/documents/${kind}`, { method: 'PUT', body: form })
}

export function setContentInTranscript(recordId: number, value: boolean) {
  return api<Documents>(`/api/records/${recordId}/documents/content-in-transcript`, { method: 'PUT', body: { value } })
}

/**
 * Yeni kayıt kaydedilince bekleyen dosyaları yükler. Önce transkript, sonra içerik ya da "içerikler transkriptte"
 * işareti. Bir dosya yüklenemezse hata mesajı döner (kayıt yine de açılmış olur, dosya sonra tekrar yüklenir).
 */
export async function uploadPending(recordId: number, pending: PendingDocuments): Promise<string | null> {
  try {
    if (pending.transcript) await uploadDocument(recordId, 'TRANSCRIPT', pending.transcript)
    if (pending.contentInTranscript) await setContentInTranscript(recordId, true)
    else if (pending.content) await uploadDocument(recordId, 'CONTENT', pending.content)
    return null
  } catch (e) {
    return (e as Error).message
  }
}

/** Kaydedilmemiş dosyayı bölümlere ayırtır (sunucuda saklanmaz); "Belgede bul" kayıttan önce de çalışsın. */
export async function readSections(file: File): Promise<DocumentSection[]> {
  const form = new FormData()
  form.append('file', file)
  const result = await api<{ fileName: string; sections: DocumentSection[] }>('/api/content-documents', {
    method: 'POST',
    body: form,
  })
  return result.sections
}

/** Kayıtlı belgeden (içerik belgesi ya da içerikler transkriptteyse transkript) bölümler. */
export async function storedSections(recordId: number): Promise<DocumentSection[]> {
  const result = await api<{ fileName: string; sections: DocumentSection[] }>(
    `/api/records/${recordId}/documents/sections`,
  )
  return result.sections
}
