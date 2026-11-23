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
  // Dersin içeriği, konu konu (kural 5). covered: Yalova konusu karşı derste karşılanıyor mu.
  topics: { text: string; covered: boolean }[]
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
  // İçerik örtüşme yüzdesi: karşılanan / toplam Yalova konusu (konu girilmemişse null). Eşik yok.
  contentPercent: number | null
}

export type Placement = { countedCredit: number; classLevel: number; semester: number; reason: string }

export type Evaluation = { matches: MatchView[]; placement: Placement }

// Ekranda düzenlenen karşı kurum dersi: kutular metin tutar. key: React'in satırları ayırt etmesi için sabit numara.
// content: dersin içeriği, her satır bir konu.
export type EditIncoming = {
  key: number
  name: string
  credit: string
  ects: string
  grade: string
  language: Language
  content: string
}

// Plandan seçilen Yalova dersi (kayda metin olarak kopyalanır). content: plandaki içeriği (sadece plan listesinde
// gelir; seçilince konulara kopyalanır, dersin kendisinde tutulmaz).
export type YalovaCourse = {
  code: string | null
  name: string
  credit: number | null
  ects: number | null
  language: Language
  content?: string | null
}

// Bir Yalova dersinin konuları: text = her satır bir konu (kutuda yazıldığı gibi), covered = karşılanıyor
// işaretli konuların metinleri. Metin ayrı tutulur ki yazarken boş satır (yeni konu) kaybolmasın.
export type YalovaTopics = { text: string; covered: string[] }

// countedTouched: komisyon "Sayıldı mı?" kutusuna kendisi dokundu mu? Dokunmadıysa kutu sistemin önerisini izler;
// dokunduysa (ya da kayıt açıldıysa) komisyonun kararı korunur. yalovaTopics: Yalova derslerinin konuları
// (anahtar: courseKey).
export type EditMatch = {
  key: number
  counted: boolean
  countedTouched: boolean
  incoming: EditIncoming[]
  yalova: YalovaCourse[]
  yalovaTopics: Record<string, YalovaTopics>
}

/** Yalova dersini tanıyan anahtar (kodu olmayan dersler de var; kod + ad birlikte). */
export const courseKey = (c: YalovaCourse) => `${c.code ?? ''}|${c.name}`

/** Kutudaki metni konulara böler: her satır bir konu, boş satırlar atlanır. */
export const lines = (text: string) =>
  text
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x !== '')

// Öğrencinin ders içerik belgesinin bir bölümü (backend: ContentDocument.Section). Belge sunucuda saklanmaz;
// bölümler sadece bu formun hafızasında durur, seçilen bölüm karşı dersin içerik kutusuna kopyalanır.
export type DocumentSection = { heading: string; code: string | null; content: string }

// Ad karşılaştırması için sadeleştirme: Türkçe küçük harf, harf/rakam dışı her şey boşluk, fazla boşluk tek.
// ı -> i: Türkçe küçültmede "II" "ıı" olur ama elle yazılan "ii" öyle kalır; ikisi aynı sayılsın.
const plainName = (s: string) =>
  s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

/**
 * Karşı dersin adını belgede arar: başlığında dersin adı geçen bölümler aday olur, en çok satırı olan seçilir
 * (başta içindekiler listesi varsa oradaki boş bölüm değil, asıl bölüm gelsin). Bulunamazsa null; o zaman
 * komisyon bölümü listeden elle seçer.
 */
export function findSection(sections: DocumentSection[], courseName: string): DocumentSection | null {
  const name = plainName(courseName)
  if (name === '') return null
  let best: DocumentSection | null = null
  for (const s of sections) {
    if (s.content === '' || !` ${plainName(s.heading)} `.includes(` ${name} `)) continue
    if (!best || lines(s.content).length > lines(best.content).length) best = s
  }
  return best
}

let nextKey = 1
export const newKey = () => nextKey++

export const emptyIncoming = (): EditIncoming => ({
  key: newKey(),
  name: '',
  credit: '',
  ects: '',
  grade: '',
  language: 'TR',
  content: '',
})

export const emptyMatch = (): EditMatch => ({
  key: newKey(),
  counted: true,
  countedTouched: false,
  incoming: [emptyIncoming()],
  yalova: [],
  yalovaTopics: {},
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
      content: c.topics.map((t) => t.text).join('\n'),
    })),
    yalova: m.yalova.map((c) => ({ code: c.code, name: c.name, credit: c.credit, ects: c.ects, language: c.language })),
    yalovaTopics: Object.fromEntries(
      m.yalova.map((c) => [
        courseKey(c),
        { text: c.topics.map((t) => t.text).join('\n'), covered: c.topics.filter((t) => t.covered).map((t) => t.text) },
      ]),
    ),
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
      // Karşı dersin konularında "karşılanıyor" işareti yok.
      topics: lines(c.content).map((text) => ({ text, covered: false })),
    })),
    yalova: m.yalova.map((c) => {
      const t = m.yalovaTopics[courseKey(c)] ?? { text: '', covered: [] }
      return {
        code: c.code,
        name: c.name,
        credit: c.credit,
        ects: c.ects,
        language: c.language,
        topics: lines(t.text).map((text) => ({ text, covered: t.covered.includes(text) })),
      }
    }),
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
