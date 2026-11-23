// MatchTable bileşen testleri: tablo gerçekten çizilir (jsdom), kullanıcı gibi kutulara bakılır.
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MatchTable from './MatchTable'
import { emptyMatch, type EditMatch } from './records'
import { emptySource, type EditSource } from './sourceCourses'

// Öğrencinin listesindeki tek ders; notu teste göre değişir.
let source: EditSource = emptySource()

// Tek eşleştirme satırı; karşı ders listedeki derse bağlı, notu verilen değer.
function rowWithGrade(grade: string): EditMatch {
  source = { ...emptySource(), name: 'Fizik I', grade }
  return { ...emptyMatch(), incoming: [{ key: 1, sourceKey: source.key, content: '' }] }
}

function draw(match: EditMatch) {
  render(<MatchTable matches={[match]} onChange={vi.fn()} results={[]} sources={[source]} planCourses={[]}
    sections={[]} disabled={false} />)
}

describe('MatchTable', () => {
  it('not BL ise gerçek harfin önceki transkriptten yazılmasını hatırlatır', () => {
    draw(rowWithGrade(' bl '))
    expect(screen.getByText(/BL notsuzdur/)).toBeInTheDocument()
  })

  it('normal notta hatırlatma çıkmaz', () => {
    draw(rowWithGrade('BA'))
    expect(screen.queryByText(/BL notsuzdur/)).not.toBeInTheDocument()
  })

  // Kural 5b: ad farklı (içerik karşılaştırması) ve Yalova dersinin konusu yok -> dersin etiketinde kırmızı ünlem.
  function contentRow(yalovaTopics: string) {
    const m = rowWithGrade('BA')
    const course = { code: 'BSM470', name: 'Oyun Programlama', credit: 3, ects: 5, language: 'TR' as const }
    const match = { ...m, yalova: [course], yalovaTopics: { 'BSM470|Oyun Programlama': { text: yalovaTopics, covered: [] } } }
    const result = {
      counted: true, incoming: [], yalova: [], grade: 'BA', yalovaCredit: 3, problems: [], warnings: [],
      suggestCounted: false, basis: 'CONTENT' as const, basisLabel: 'İçerik karşılaştırması', contentPercent: null,
    }
    render(<MatchTable matches={[match]} onChange={vi.fn()} results={[result]} sources={[source]} planCourses={[course]} sections={[]} disabled={false} />)
  }

  it('içeriği olmayan ve adı tutmayan Yalova dersinin yanında kırmızı ünlem çıkar', () => {
    contentRow('')
    expect(screen.getByLabelText('İçeriği yok, isim benzerliği yok')).toBeInTheDocument()
  })

  it('Yalova dersinin konusu varsa ünlem çıkmaz', () => {
    contentRow('Oyun motorları')
    expect(screen.queryByLabelText('İçeriği yok, isim benzerliği yok')).not.toBeInTheDocument()
  })
})
