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

// ---- Ders eşleştirme (backend: RecordService.MatchView / Evaluation) ----

export type Language = 'TR' | 'EN'

export type CourseView = {
  code: string | null
  name: string
  credit: number | null
  ects: number | null
  language: Language
  grade: string | null
  convertedGrade: string | null
}

export type MatchView = {
  counted: boolean
  incoming: CourseView[]
  yalova: CourseView[]
  grade: string | null
  yalovaCredit: number
  problems: string[]
}

export type Placement = { countedCredit: number; classLevel: number; semester: number; reason: string }

export type Evaluation = { matches: MatchView[]; placement: Placement }

// Ekranda düzenlenen karşı kurum dersi: kutular metin tutar. key: React'in satırları ayırt etmesi için sabit numara.
export type EditIncoming = { key: number; name: string; credit: string; ects: string; grade: string; language: Language }

// Plandan seçilen Yalova dersi (kayda metin olarak kopyalanır).
export type YalovaCourse = { code: string | null; name: string; credit: number | null; ects: number | null; language: Language }

export type EditMatch = { key: number; counted: boolean; incoming: EditIncoming[]; yalova: YalovaCourse[] }

let nextKey = 1
export const newKey = () => nextKey++

export const emptyIncoming = (): EditIncoming => ({ key: newKey(), name: '', credit: '', ects: '', grade: '', language: 'TR' })

export const emptyMatch = (): EditMatch => ({ key: newKey(), counted: true, incoming: [emptyIncoming()], yalova: [] })

// "3,5" gibi Türkçe virgüllü yazımı da kabul eder; boş kutu = değer yok (null).
export const toNumber = (s: string): number | null => (s.trim() === '' ? null : Number(s.replace(',', '.')))

/** Kayıttan gelen satırı düzenlenebilir hale getirir. */
export function toEditMatch(m: MatchView): EditMatch {
  return {
    key: newKey(),
    counted: m.counted,
    incoming: m.incoming.map((c) => ({
      key: newKey(),
      name: c.name,
      credit: c.credit?.toString() ?? '',
      ects: c.ects?.toString() ?? '',
      grade: c.grade ?? '',
      language: c.language,
    })),
    yalova: m.yalova.map((c) => ({ code: c.code, name: c.name, credit: c.credit, ects: c.ects, language: c.language })),
  }
}

/** Backend'e gidecek biçim (RecordService.MatchInput). */
export function toMatchInput(m: EditMatch) {
  return {
    counted: m.counted,
    incoming: m.incoming.map((c) => ({
      name: c.name,
      credit: toNumber(c.credit),
      ects: toNumber(c.ects),
      grade: c.grade,
      language: c.language,
    })),
    yalova: m.yalova,
  }
}
