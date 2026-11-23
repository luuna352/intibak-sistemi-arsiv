// Not dönüşüm tablolarının ekranda gösterilme biçimi (Ayarlar > Not tabloları ve formdaki tablo önizlemesi).
// Senato İntibak Esasları EK-1'deki üç tablo gibi: her tablo sadece kendi not sisteminin sütunlarını gösterir,
// sağda hep "YÜ not karşılığı: harf | sayı" durur. Boş sütun kalmaz.

// Backend GradeSystem: karşı üniversitenin not sistemi (tablo açılırken seçilir).
export type GradeSystem = 'SCORE' | 'LETTER_NUMBER' | 'LETTER'

// Backend GradeTableService.Row. Yalova puanı (targetPoints) harften hesaplanıp gelir.
export type GradeRow = {
  sourceLetter: string | null
  sourceMin: number | null
  sourceMax: number | null
  targetLetter: string
  targetPoints: number
}

// Her not sisteminin adı, açıklaması ve "Diğer üniversite not sistemi" başlığının altındaki sütunlar.
export const GRADE_SYSTEMS: Record<GradeSystem, { label: string; description: string; columns: string[] }> = {
  SCORE: {
    label: "100'lük puan",
    description:
      "Karşı üniversite 100'lük puan veriyor. Öğrencinin puanı hangi aralıktaysa o satırın Yalova notu verilir. " +
      'Aralık yerine DEVAMSIZ gibi özel bir not da yazılabilir.',
    columns: ["100'lü not"],
  },
  LETTER_NUMBER: {
    label: 'Harf ve sayı (A, A-, B+ ...)',
    description:
      "Karşı üniversite harf notu ve onun 4'lük sayı karşılığını veriyor. Öğrencinin harfi ya da sayısı tabloda " +
      'aranır. Sayısı olmayan not (örn. F0 devamsız) için sayı boş bırakılır.',
    columns: ['Harf', 'Sayı'],
  },
  LETTER: {
    label: 'Sadece harf (A1 ... F3)',
    description: 'Karşı üniversite sadece harf notu veriyor. Öğrencinin harfi tabloda aranır.',
    columns: ['Harf'],
  },
}

// Hücreler arasında çizgi: EK-1'deki tablo görünümü.
export const gridSx = { '& td, & th': { border: 1, borderColor: 'divider' } }

export const SYSTEM_OPTIONS =Object.entries(GRADE_SYSTEMS).map(([value, s]) => ({
  value: value as GradeSystem,
  label: s.label,
}))

// 90 -> "90", 85.5 -> "85.5" (aralıklarda gereksiz sıfır yazılmaz).
const plain = (n: number) => String(Number(n))
// 4 -> "4.00": sayılar EK-1'deki gibi iki basamaklı.
export const twoDecimals = (n: number) => Number(n).toFixed(2)

/** Satırın "Diğer üniversite" hücreleri, tablonun not sistemine göre (sütun sayısı GRADE_SYSTEMS ile aynı). */
export function sourceCells(system: GradeSystem, r: GradeRow): string[] {
  switch (system) {
    case 'SCORE':
      // Aralık varsa "90-100" (alt = üst ise tek sayı), yoksa özel not (DEVAMSIZ).
      if (r.sourceMin === null || r.sourceMax === null) return [r.sourceLetter ?? '']
      return [Number(r.sourceMin) === Number(r.sourceMax) ? plain(r.sourceMin) : `${plain(r.sourceMin)}-${plain(r.sourceMax)}`]
    case 'LETTER_NUMBER':
      return [r.sourceLetter ?? '', r.sourceMin === null ? '—' : twoDecimals(r.sourceMin)]
    case 'LETTER':
      return [r.sourceLetter ?? '']
  }
}

// Ekranda düzenlenen satır. source: 100'lükte "90-100" ya da "DEVAMSIZ", diğerlerinde harf notu.
// number: sadece "harf ve sayı" tablosunda harfin sayı karşılığı (3.70).
export type EditRow = { source: string; number: string; targetLetter: string }

export const emptyEditRow = (): EditRow => ({ source: '', number: '', targetLetter: '' })

export function toEditRow(system: GradeSystem, r: GradeRow): EditRow {
  if (system === 'LETTER_NUMBER') {
    return { source: r.sourceLetter ?? '', number: r.sourceMin === null ? '' : twoDecimals(r.sourceMin), targetLetter: r.targetLetter }
  }
  return { source: sourceCells(system, r)[0], number: '', targetLetter: r.targetLetter }
}

// "85,5" gibi Türkçe virgüllü yazımı da kabul eder; boş kutu = değer yok (null).
const toNumber = (s: string): number | null => (s.trim() === '' ? null : Number(s.replace(',', '.')))
// 100'lükte aralık yazımı: "90-100", "90 - 100", "85,5-89" ya da tek sayı "100".
const RANGE = /^\s*(\d+(?:[.,]\d+)?)\s*(?:-\s*(\d+(?:[.,]\d+)?))?\s*$/

/** Düzenlenen satırı backend'in beklediği hale çevirir (harf, alt-üst sınır, Yalova harfi). */
export function toRowInput(system: GradeSystem, e: EditRow) {
  const target = e.targetLetter || null
  if (system === 'SCORE') {
    const m = RANGE.exec(e.source)
    if (m) {
      const min = toNumber(m[1])
      return { sourceLetter: null, sourceMin: min, sourceMax: m[2] ? toNumber(m[2]) : min, targetLetter: target }
    }
    return { sourceLetter: e.source.trim() || null, sourceMin: null, sourceMax: null, targetLetter: target }
  }
  const number = system === 'LETTER_NUMBER' ? toNumber(e.number) : null
  return { sourceLetter: e.source.trim() || null, sourceMin: number, sourceMax: number, targetLetter: target }
}
