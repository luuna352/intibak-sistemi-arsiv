// Öğrencinin ders listesi (transkriptteki bütün dersler) ve iki sütunlu ekranın kuralları: hangi ders hangi
// eşleştirmede, otomatik eşleştirme (kural 3 ve 4) ve kural 5b işareti. Backend: RecordService.SourceCourse*.
import {
  courseKey,
  findSection,
  lines,
  newKey,
  toNumber,
  withPlanTopics,
  type DocumentSection,
  type EditMatch,
  type Language,
  type YalovaCourse,
} from './records'

// Backend SourceCourseView.
export type SourceCourseView = {
  code: string | null
  name: string
  semester: string | null
  credit: number | null
  ects: number | null
  language: Language
  grade: string | null
}

// Ekranda düzenlenen ders: kutular metin tutar. key: eşleştirmedeki karşı ders bu numarayla listedeki derse bağlanır
// (dizideki sıra değil; satır silinince/eklenince bağlantılar karışmasın).
export type EditSource = {
  key: number
  code: string
  name: string
  semester: string
  credit: string
  ects: string
  grade: string
  language: Language
}

// Plandaki Yalova dersi, ekranda gruplamak için yarıyılı ve seçmeli grubuyla (backend CurriculumService.Course).
export type PlanCourse = YalovaCourse & { semester: number | null; groupName: string | null; compulsory: boolean }

export const emptySource = (): EditSource => ({
  key: newKey(),
  code: '',
  name: '',
  semester: '',
  credit: '',
  ects: '',
  grade: '',
  language: 'TR',
})

export const toEditSource = (s: SourceCourseView): EditSource => ({
  key: newKey(),
  code: s.code ?? '',
  name: s.name,
  semester: s.semester ?? '',
  credit: s.credit?.toString() ?? '',
  ects: s.ects?.toString() ?? '',
  grade: s.grade ?? '',
  language: s.language,
})

/** Tamamen boş ve hiçbir eşleştirmede kullanılmayan satır kayda gitmez (yeni eklenip doldurulmamış satır). */
export function sourcesToSend(sources: EditSource[], matches: EditMatch[]): EditSource[] {
  const used = new Set(matches.flatMap((m) => m.incoming.map((c) => c.sourceKey)))
  return sources.filter(
    (s) => used.has(s.key) || [s.code, s.name, s.semester, s.credit, s.ects, s.grade].some((x) => x.trim() !== ''),
  )
}

/** Backend'e gidecek biçim (RecordService.SourceCourseInput). */
export const toSourceInput = (s: EditSource) => ({
  code: s.code,
  name: s.name,
  semester: s.semester,
  credit: toNumber(s.credit),
  ects: toNumber(s.ects),
  language: s.language,
  grade: s.grade,
})

// "BL": önceki üniversitede alınıp notsuz geçirilmiş ders; gerçek harf önceki kaydın transkriptinden yazılır.
export const isBL = (grade: string) => grade.trim().toLocaleUpperCase('tr') === 'BL'

// Sondaki Roma rakamı sayıya çevrilir ("Fizik II" = "Fizik 2"); backend MatchCalculator.ROMAN ile aynı. Türkçe küçük
// harfte "I" -> "ı" olduğu için iki yazım da var.
const ROMAN: Record<string, string> = {
  i: '1', ı: '1', ii: '2', ıı: '2', iii: '3', ııı: '3', iv: '4', ıv: '4',
}

/**
 * Ad karşılaştırması için sadeleştirme (backend MatchCalculator.normalizeName ile birebir aynı kural; ikisi farklı
 * olursa ekran "aynı ad" deyip backend "içerik karşılaştırması" diyebilir): Türkçe küçük harf, harf/rakam dışı her
 * şey boşluk, sondaki I/II/III/IV sayı. "FİZİK - II" ile "fizik 2" aynı sonucu verir.
 */
export function normalizeName(name: string): string {
  const words = name
    .toLocaleLowerCase('tr')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
  const last = words[words.length - 1]
  words[words.length - 1] = ROMAN[last] ?? last
  return words.join(' ')
}

/**
 * Kural 3 dersi mi: Türk Dili (öğrencide "Türkçe" de olabilir) ya da Atatürk İlkeleri ve İnkılap Tarihi. Sondaki
 * numarayla birlikte döner ("Türk Dili II" -> { kind: 'DIL', number: '2' }); numara yoksa null. Otomatik eşleştirme
 * sadece tür ve numara ikisi de tutuyorsa yapılır; numarasız dersi komisyon eşleştirir.
 */
export function commonCourse(name: string): { kind: 'DIL' | 'TARIH'; number: string | null } | null {
  const n = normalizeName(name)
  const last = n.split(' ').pop() ?? ''
  const number = /^\d+$/.test(last) ? last : null
  if (n.includes('türk dili') || n.includes('türkçe')) return { kind: 'DIL', number }
  // Backend'deki Yalova tarafı kelimeleri: "atatürk", "inkılap", "inkilap".
  if (n.includes('atatürk') || n.includes('inkılap') || n.includes('inkilap')) return { kind: 'TARIH', number }
  return null
}

/** Listedeki dersin bulunduğu eşleştirme satırlarının numaraları (1'den). */
export const rowsOfSource = (matches: EditMatch[], key: number) =>
  matches.flatMap((m, i) => (m.incoming.some((c) => c.sourceKey === key) ? [i + 1] : []))

/** Yalova dersinin bulunduğu eşleştirme satırlarının numaraları (1'den). */
export const rowsOfYalova = (matches: EditMatch[], c: YalovaCourse) =>
  matches.flatMap((m, i) => (m.yalova.some((y) => courseKey(y) === courseKey(c)) ? [i + 1] : []))

/** Öğrenci derslerinin sadeleştirilmiş adları (kural 4 kontrolünde her ders için listeyi baştan taramamak için). */
export const sourceNames = (sources: EditSource[]) =>
  new Set(sources.filter((s) => s.name.trim() !== '').map((s) => normalizeName(s.name)))

/**
 * Kural 5b (iki sütunlu ekran): Yalova dersinin içeriği yok ve öğrencinin listesinde aynı adlı ders yok. Bu ders
 * ne otomatik eşleşir ne içerikle karşılaştırılabilir; yanında kırmızı ünlem gösterilir. names: sourceNames sonucu.
 */
export const noContentNoName = (c: YalovaCourse, names: Set<string>) =>
  lines(c.content ?? '').length === 0 && !names.has(normalizeName(c.name))

/** Yeni eşleştirme satırı: seçilen karşı dersler ve Yalova dersleri (Yalova konuları plandan gelir). */
export function newMatch(sourceKeys: number[], yalova: YalovaCourse[], contentOf: (key: number) => string): EditMatch {
  const base: EditMatch = {
    key: newKey(),
    counted: true,
    countedTouched: false,
    incoming: sourceKeys.map((sourceKey) => ({ key: newKey(), sourceKey, content: contentOf(sourceKey) })),
    yalova: [],
    yalovaTopics: {},
  }
  return { ...base, ...withPlanTopics(base, yalova) }
}

/**
 * Otomatik eşleştirme (kural 3 ve 4): henüz hiçbir satırda olmayan öğrenci dersleri, yine hiçbir satırda olmayan
 * Yalova dersleriyle birebir eşleşir. Önce adı aynı olanlar (kural 4), sonra Türk Dili / tarih dersleri tür ve
 * numarası tutuyorsa (kural 3). Adı farklı diğer dersler eşleşmez: onları komisyon seçip içerikle karşılaştırır.
 * Dönen satırlar mevcut satırlara eklenecek yeni satırlardır.
 */
export function autoMatches(sources: EditSource[], plan: YalovaCourse[], matches: EditMatch[]): EditMatch[] {
  const usedSources = new Set(matches.flatMap((m) => m.incoming.map((c) => c.sourceKey)))
  const usedYalova = new Set(matches.flatMap((m) => m.yalova.map(courseKey)))
  const free = sources.filter((s) => s.name.trim() !== '' && !usedSources.has(s.key))
  const result: EditMatch[] = []

  const take = (s: EditSource, y: YalovaCourse) => {
    usedSources.add(s.key)
    usedYalova.add(courseKey(y))
    result.push(newMatch([s.key], [y], () => ''))
  }

  // Plan derslerinin sadeleştirilmiş adları bir kez hesaplanır (her öğrenci dersi için tekrar tekrar değil).
  const planInfo = plan.map((c) => ({ c, name: normalizeName(c.name), common: commonCourse(c.name) }))

  // Kural 4: ad aynı.
  for (const s of free) {
    const name = normalizeName(s.name)
    const y = planInfo.find((p) => !usedYalova.has(courseKey(p.c)) && p.name === name)
    if (y) take(s, y.c)
  }
  // Kural 3: Türk Dili / tarih, tür ve numara aynı.
  for (const s of free) {
    if (usedSources.has(s.key)) continue
    const sc = commonCourse(s.name)
    if (!sc || sc.number === null) continue
    const y = planInfo.find(
      (p) => !usedYalova.has(courseKey(p.c)) && p.common?.kind === sc.kind && p.common.number === sc.number,
    )
    if (y) take(s, y.c)
  }
  return result
}

/**
 * Kayda/önizlemeye gidecek ders listesi ve her dersin o listedeki sırası. Eşleştirmedeki karşı ders backend'e bu
 * sıra numarasıyla gider (indexOf: -1 = listede yok).
 */
export function sendPlan(sources: EditSource[], matches: EditMatch[]) {
  const list = sourcesToSend(sources, matches)
  const index = new Map(list.map((s, i) => [s.key, i]))
  return { list, indexOf: (key: number) => index.get(key) ?? -1 }
}

/** Açılır listede ve etiketlerde dersin yazılışı: "FIZ101 Fizik I (1. yy, 3 kr, 5 AKTS, BA)". */
export function sourceLabel(s: EditSource): string {
  const details = [
    s.semester && `${s.semester}. yy`,
    s.credit && `${s.credit} kr`,
    s.ects && `${s.ects} AKTS`,
    s.grade,
    s.language === 'EN' && 'EN',
  ].filter(Boolean)
  return `${s.code ? s.code + ' ' : ''}${s.name || '(adsız)'}${details.length ? ` (${details.join(', ')})` : ''}`
}

/**
 * Öğrenci dersinin içeriği: bir eşleştirmede yazılmışsa o, yoksa öğrencinin içerik belgesinde dersin adıyla bulunan
 * bölüm (A3), o da yoksa boş metin.
 */
export function sourceContent(s: EditSource, matches: EditMatch[], sections: DocumentSection[]): string {
  for (const m of matches) {
    const c = m.incoming.find((x) => x.sourceKey === s.key && x.content.trim() !== '')
    if (c) return c.content
  }
  return findSection(sections, s.name)?.content ?? ''
}
