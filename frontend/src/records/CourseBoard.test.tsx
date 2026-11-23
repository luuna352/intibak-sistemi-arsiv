// CourseBoard (iki sütunlu karşılaştırma ekranı) testleri: otomatik eşleştirme düğmesi, elle eşleştirme, kural 5b
// işareti ve içerik açma. State gerçek olsun diye bileşen küçük bir sarmalayıcıyla çizilir.
import { useEffect, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import CourseBoard from './CourseBoard'
import type { EditMatch } from './records'
import { emptySource, type EditSource, type PlanCourse } from './sourceCourses'

const plan = (code: string, name: string, content: string | null = null): PlanCourse => ({
  code, name, credit: 3, ects: 5, language: 'TR', content, semester: 1, groupName: null, compulsory: true,
})

// Son çizimdeki eşleştirmeler (test sonuca bakabilsin).
let lastMatches: EditMatch[] = []

function Board({ initial, courses }: { initial: EditSource[]; courses: PlanCourse[] }) {
  const [sources, setSources] = useState(initial)
  const [matches, setMatches] = useState<EditMatch[]>([])
  useEffect(() => {
    lastMatches = matches
  }, [matches])
  return (
    <CourseBoard sources={sources} onSourcesChange={setSources} matches={matches} onMatchesChange={setMatches}
      planCourses={courses} sections={[]} disabled={false} />
  )
}

const source = (name: string): EditSource => ({ ...emptySource(), name })

describe('CourseBoard', () => {
  it('"Otomatik eşleştir" adı aynı dersi eşleştirir, sayaç sıfıra iner', async () => {
    render(<Board initial={[source('Fizik I'), source('Algoritmalar')]}
      courses={[plan('FIZ101', 'Fizik I'), plan('BSM101', 'Programlamaya Giriş', 'Döngüler')]} />)
    await userEvent.click(screen.getByRole('button', { name: 'Otomatik eşleştir (1)' }))
    expect(lastMatches).toHaveLength(1)
    expect(lastMatches[0].yalova[0].code).toBe('FIZ101')
    expect(screen.getByRole('button', { name: 'Otomatik eşleştir (0)' })).toBeDisabled()
  })

  it('iki taraftan işaretlenen dersler "Seçilenleri eşleştir" ile tek satır olur', async () => {
    render(<Board initial={[source('Algoritmalar')]} courses={[plan('BSM101', 'Programlamaya Giriş', 'Döngüler')]} />)
    await userEvent.click(screen.getByLabelText('Algoritmalar seç'))
    await userEvent.click(screen.getByLabelText('Programlamaya Giriş seç'))
    await userEvent.click(screen.getByRole('button', { name: /Seçilenleri eşleştir/ }))
    expect(lastMatches).toHaveLength(1)
    expect(lastMatches[0].yalovaTopics['BSM101|Programlamaya Giriş'].text).toBe('Döngüler')
  })

  it('içeriği olmayan ve öğrencide aynı adı olmayan Yalova dersinde kırmızı ünlem çıkar', () => {
    render(<Board initial={[source('Algoritmalar')]}
      courses={[plan('BSM470', 'Oyun Programlama'), plan('FIZ101', 'Fizik I', 'Kuvvet')]} />)
    expect(screen.getAllByLabelText('İçeriği yok, isim benzerliği yok')).toHaveLength(1)
  })

  it('Yalova dersine tıklayınca içeriği açılır', async () => {
    render(<Board initial={[]} courses={[plan('FIZ101', 'Fizik I', 'Kuvvet ve hareket')]} />)
    expect(screen.queryByText('Kuvvet ve hareket')).not.toBeInTheDocument()
    await userEvent.click(screen.getByText(/Fizik I/))
    expect(screen.getByText('Kuvvet ve hareket')).toBeInTheDocument()
  })
})
