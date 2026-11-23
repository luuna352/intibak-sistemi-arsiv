// MatchTable bileşen testleri: tablo gerçekten çizilir (jsdom), kullanıcı gibi kutulara bakılır.
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MatchTable from './MatchTable'
import { emptyMatch, type EditMatch } from './records'

// Tek eşleştirme satırı; karşı dersin notu verilen değer.
function rowWithGrade(grade: string): EditMatch {
  const m = emptyMatch()
  return { ...m, incoming: [{ ...m.incoming[0], name: 'Fizik I', grade }] }
}

function draw(match: EditMatch) {
  render(<MatchTable matches={[match]} onChange={vi.fn()} results={[]} planCourses={[]} sections={[]} disabled={false} />)
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
})
