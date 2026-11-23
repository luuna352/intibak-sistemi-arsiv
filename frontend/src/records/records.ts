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
  prepStatus: PrepStatus
  departmentLanguage: DepartmentLanguage
  status: RecordStatus
  statusLabel: string
  createdByName: string
  createdAt: string
  updatedByName: string | null
  updatedAt: string | null
}

// Kural 2b: İngilizce karşı dersin sayılması için hazırlık geçilmiş ya da bölüm en az %30 İngilizce olmalı.
export type PrepStatus = 'PASSED' | 'NOT_TAKEN' | 'UNKNOWN'
export type DepartmentLanguage = 'TR' | 'EN30' | 'EN100' | 'UNKNOWN'
export const PREP_OPTIONS: { value: PrepStatus; label: string }[] = [
  { value: 'UNKNOWN', label: 'Bilinmiyor' },
  { value: 'PASSED', label: 'Geçti / sınavla muaf' },
  { value: 'NOT_TAKEN', label: 'Okumadı / geçemedi' },
]
export const DEPARTMENT_LANGUAGE_OPTIONS: { value: DepartmentLanguage; label: string }[] = [
  { value: 'UNKNOWN', label: 'Bilinmiyor' },
  { value: 'TR', label: 'Türkçe' },
  { value: 'EN30', label: '%30 İngilizce' },
  { value: 'EN100', label: '%100 İngilizce' },
]

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
  // Eksik bilgi: satır bu haliyle sayılamaz (not yok, ders seçilmemiş...).
  problems: string[]
  // Kural önerisi: sistem "sayılmaz" der ama komisyon yine de sayabilir (dil farkı, başarısız not...).
  warnings: string[]
  // Sistemin önerisi: eksik bilgi ve kural uyarısı yoksa true.
  suggestCounted: boolean
  // Hangi kural: Türk Dili / tarih ve aynı ad doğrudan kabul, ad farklıysa içerik karşılaştırması (kural 3-5).
  basis: 'COMMON_COURSE' | 'SAME_NAME' | 'CONTENT' | null
  basisLabel: string | null
}

export type Placement = { countedCredit: number; classLevel: number; semester: number; reason: string }

export type Evaluation = { matches: MatchView[]; placement: Placement }

// Ekranda düzenlenen karşı kurum dersi: kutular metin tutar. key: React'in satırları ayırt etmesi için sabit numara.
export type EditIncoming = { key: number; name: string; credit: string; ects: string; grade: string; language: Language }

// Plandan seçilen Yalova dersi (kayda metin olarak kopyalanır).
export type YalovaCourse = { code: string | null; name: string; credit: number | null; ects: number | null; language: Language }

// countedTouched: komisyon "Sayıldı mı?" kutusuna kendisi dokundu mu? Dokunmadıysa kutu sistemin önerisini izler;
// dokunduysa (ya da kayıt açıldıysa) komisyonun kararı korunur.
export type EditMatch = {
  key: number
  counted: boolean
  countedTouched: boolean
  incoming: EditIncoming[]
  yalova: YalovaCourse[]
}

let nextKey = 1
export const newKey = () => nextKey++

export const emptyIncoming = (): EditIncoming => ({ key: newKey(), name: '', credit: '', ects: '', grade: '', language: 'TR' })

export const emptyMatch = (): EditMatch => ({
  key: newKey(),
  counted: true,
  countedTouched: false,
  incoming: [emptyIncoming()],
  yalova: [],
})

// "3,5" gibi Türkçe virgüllü yazımı da kabul eder; boş kutu = değer yok (null).
export const toNumber = (s: string): number | null => (s.trim() === '' ? null : Number(s.replace(',', '.')))

/** Kayıttan gelen satırı düzenlenebilir hale getirir. */
export function toEditMatch(m: MatchView): EditMatch {
  return {
    key: newKey(),
    counted: m.counted,
    // Kaydedilmiş karar komisyonundur: sistem önerisi onu değiştirmez.
    countedTouched: true,
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

/**
 * Komisyonun dokunmadığı satırlarda "Sayıldı mı?" kutusunu sistemin önerisine getirir (kural 8: sistem önerir,
 * komisyon karar verir). keys: önizleme istenirken satırların sırası; cevap gelene kadar satır silinmiş olabilir,
 * bu yüzden satırlar sıra numarasıyla değil key ile eşleştirilir. Eksik bilgili satırda öneri yoktur, kutuya
 * dokunulmaz. Değişiklik yoksa aynı dizi döner (React gereksiz yere yeniden hesaplatmasın).
 */
export function applySuggestions(matches: EditMatch[], keys: number[], results: MatchView[]): EditMatch[] {
  let changed = false
  const next = matches.map((m) => {
    const r = results[keys.indexOf(m.key)]
    if (!r || m.countedTouched || r.problems.length > 0 || m.counted === r.suggestCounted) return m
    changed = true
    return { ...m, counted: r.suggestCounted }
  })
  return changed ? next : matches
}
