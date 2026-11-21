// İntibak kaydı ekranlarının ortak tipleri ve yardımcıları (backend: RecordService kayıtları).

export type RecordStatus = 'OLUSTURULUYOR' | 'DEGISTIRILIYOR' | 'IPTAL' | 'WORDE_AKTARILDI'

export type RecordListItem = {
  id: number
  tcMasked: string
  fullName: string
  transferType: string
  transferTypeLabel: string
  university: string | null
  createdByName: string
  createdAt: string
  updatedByName: string | null
  updatedAt: string | null
  status: RecordStatus
  statusLabel: string
}

export type RecordDetail = {
  id: number
  tcNo: string
  fullName: string
  transferType: string
  transferTypeLabel: string
  university: string | null
  facultyDepartment: string | null
  registrationDate: string | null
  status: RecordStatus
  statusLabel: string
  createdByName: string
  createdAt: string
  updatedByName: string | null
  updatedAt: string | null
}

// Durum etiketinin rengi: MUI Chip renk adları.
export const statusColor: Record<RecordStatus, 'info' | 'warning' | 'default' | 'success'> = {
  OLUSTURULUYOR: 'info',
  DEGISTIRILIYOR: 'warning',
  IPTAL: 'default',
  WORDE_AKTARILDI: 'success',
}

/** "2026-11-21T10:00:00Z" -> "21.11.2026" (boşsa boş metin). */
export const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('tr-TR') : '')
