// records.ts yardımcılarının testleri: konu satırları, belgede bölüm bulma, sayı çevirme, kayda gidecek biçim ve
// "Sayıldı mı?" önerisinin uygulanması.
import { describe, expect, it } from 'vitest'
import {
  applySuggestions,
  emptyMatch,
  findSection,
  lines,
  toEditMatch,
  toMatchInput,
  toNumber,
  type MatchView,
} from './records'

// Testlerde kullanılan sahte hesap sonucu: sadece istenen alanlar değişir.
function view(change: Partial<MatchView> = {}): MatchView {
  return {
    counted: true,
    incoming: [],
    yalova: [],
    grade: null,
    yalovaCredit: 0,
    problems: [],
    warnings: [],
    suggestCounted: true,
    basis: null,
    basisLabel: null,
    contentPercent: null,
    ...change,
  }
}

describe('lines', () => {
  it('her satırı bir konu sayar, boş satırları ve kenar boşluklarını atar', () => {
    expect(lines('  Diziler \n\n Ağaçlar\n   \nGraflar')).toEqual(['Diziler', 'Ağaçlar', 'Graflar'])
  })
})

describe('toNumber', () => {
  it('Türkçe virgülü kabul eder, boş kutu null olur', () => {
    expect(toNumber('3,5')).toBe(3.5)
    expect(toNumber('4')).toBe(4)
    expect(toNumber('  ')).toBeNull()
  })
})

describe('findSection', () => {
  const sections = [
    { heading: 'İÇİNDEKİLER', code: null, content: 'BIL102 Veri Yapıları' },
    { heading: 'BIL102 Veri Yapıları', code: 'BIL102', content: '' },
    { heading: 'BIL102 - VERİ YAPILARI', code: 'BIL102', content: 'Listeler\nAğaçlar\nGraflar' },
    { heading: 'BIL101 Programlama I', code: 'BIL101', content: 'Değişkenler' },
  ]

  it('büyük/küçük harf ve noktalama farkına bakmadan adı başlıkta bulur, en uzun bölümü seçer', () => {
    expect(findSection(sections, 'veri yapıları')?.content).toBe('Listeler\nAğaçlar\nGraflar')
  })

  it('kelime ortasında eşleşmez ve bulamazsa null döner', () => {
    expect(findSection(sections, 'Yapı')).toBeNull()
    expect(findSection(sections, 'Fizik')).toBeNull()
    expect(findSection(sections, '   ')).toBeNull()
  })

  it('"I" ile yazılan numarayı aynı yazımla bulur', () => {
    expect(findSection(sections, 'Programlama I')?.code).toBe('BIL101')
  })
})

describe('toMatchInput / toEditMatch', () => {
  it('kayıttan gelen satırı düzenlenebilir hale getirip geri çevirince aynı bilgi kalır', () => {
    const saved = view({
      counted: false,
      incoming: [{ code: null, name: 'Data Structures', credit: 3, ects: 5, language: 'EN', grade: 'AA',
        convertedGrade: 'AA', topics: [{ text: 'Lists', covered: false }], source: 4, semester: '3' }],
      yalova: [{ code: 'BSM201', name: 'Veri Yapıları', credit: 3, ects: 5, language: 'TR', grade: null,
        convertedGrade: null, topics: [{ text: 'Listeler', covered: true }, { text: 'Graflar', covered: false }],
        source: null, semester: null }],
    })
    // Listedeki 4. ders ekranda 77 numaralı satır; gönderirken 77 yine 4. sıraya döner.
    const edit = toEditMatch(saved, (c) => (c.source === 4 ? 77 : -1))
    expect(edit.incoming[0].sourceKey).toBe(77)
    const input = toMatchInput(edit, (key) => (key === 77 ? 4 : -1))
    expect(input.counted).toBe(false)
    expect(input.incoming).toEqual([{ source: 4, topics: [{ text: 'Lists', covered: false }] }])
    expect(input.yalova[0].topics).toEqual([
      { text: 'Listeler', covered: true },
      { text: 'Graflar', covered: false },
    ])
  })

  it('listede olmayan derse bağlı karşı ders gönderilmez', () => {
    const m = { ...emptyMatch(), incoming: [{ key: 1, sourceKey: 5, content: '' }] }
    expect(toMatchInput(m, () => -1).incoming).toEqual([])
  })
})

describe('applySuggestions', () => {
  it('komisyonun dokunmadığı satırda kutuyu sistemin önerisine getirir', () => {
    const m = { ...emptyMatch(), counted: true }
    const next = applySuggestions([m], [m.key], [view({ suggestCounted: false })])
    expect(next[0].counted).toBe(false)
  })

  it('komisyonun dokunduğu ya da eksik bilgili satıra dokunmaz; değişiklik yoksa aynı dizi döner', () => {
    const touched = { ...emptyMatch(), counted: true, countedTouched: true }
    const missing = { ...emptyMatch(), counted: true }
    const matches = [touched, missing]
    const next = applySuggestions(matches, [touched.key, missing.key], [
      view({ suggestCounted: false }),
      view({ suggestCounted: false, problems: ['Not girilmemiş.'] }),
    ])
    expect(next).toBe(matches)
  })

  it('cevap gelene kadar silinen satır yüzünden sonuçlar kaymaz (sıra değil key ile eşleşir)', () => {
    const a = { ...emptyMatch(), counted: true }
    const b = { ...emptyMatch(), counted: true }
    // Önizleme [silinen, b] sırasıyla istenmiş; şimdi sadece b var.
    const next = applySuggestions([b], [a.key - 100, b.key], [view({ suggestCounted: true }), view({ suggestCounted: false })])
    expect(next[0].counted).toBe(false)
  })
})
