// Öğrenci ders listesi yardımcılarının testleri: ad sadeleştirme (backend ile aynı olmalı), kural 3 dersleri,
// otomatik eşleştirme, kural 5b işareti ve kayda gidecek liste.
import { describe, expect, it } from 'vitest'
import { emptyMatch, type YalovaCourse } from './records'
import {
  autoMatches,
  commonCourse,
  emptySource,
  noContentNoName,
  normalizeName,
  sendPlan,
  sourceNames,
  type EditSource,
  type PlanCourse,
} from './sourceCourses'

const source = (name: string, change: Partial<EditSource> = {}): EditSource => ({ ...emptySource(), name, ...change })
const plan = (code: string, name: string, content: string | null = null): PlanCourse => ({
  code, name, credit: 3, ects: 5, language: 'TR', content, semester: 1, groupName: null, compulsory: true,
})

describe('normalizeName', () => {
  it('büyük/küçük harf, noktalama ve sondaki Roma rakamı farkını yok sayar', () => {
    expect(normalizeName('FİZİK - II')).toBe('fizik 2')
    expect(normalizeName('fizik 2')).toBe('fizik 2')
    expect(normalizeName('Fizik ii')).toBe('fizik 2')
  })

  it('Türkçe ı ile i farklı harftir (backend de böyle karşılaştırır)', () => {
    expect(normalizeName('Işık')).not.toBe(normalizeName('Isik'))
  })
})

describe('commonCourse', () => {
  it('Türk Dili ve Türkçe aynı tür, numarasıyla', () => {
    expect(commonCourse('Türk Dili II')).toEqual({ kind: 'DIL', number: '2' })
    expect(commonCourse('Türkçe 2')).toEqual({ kind: 'DIL', number: '2' })
  })

  it('Atatürk İlkeleri ve İnkılap Tarihi tarih türü; ilgisiz ders null', () => {
    expect(commonCourse('Atatürk İlkeleri ve İnkılap Tarihi I')).toEqual({ kind: 'TARIH', number: '1' })
    expect(commonCourse('Matematik I')).toBeNull()
  })
})

describe('autoMatches', () => {
  it('adı aynı dersleri ve Türk Dili derslerini birebir eşleştirir, adı farklı dersi eşleştirmez', () => {
    const sources = [source('FİZİK - I'), source('Türkçe I'), source('Algoritmalar')]
    const yalova = [plan('FIZ101', 'Fizik I'), plan('TDL101', 'Türk Dili I'), plan('BSM101', 'Programlamaya Giriş')]
    const result = autoMatches(sources, yalova, [])
    expect(result.map((m) => [m.incoming[0].sourceKey, m.yalova[0].code])).toEqual([
      [sources[0].key, 'FIZ101'],
      [sources[1].key, 'TDL101'],
    ])
  })

  it('zaten bir satırda olan dersleri tekrar eşleştirmez', () => {
    const s = source('Fizik I')
    const existing = { ...emptyMatch(), incoming: [{ key: 1, sourceKey: s.key, content: '' }] }
    expect(autoMatches([s], [plan('FIZ101', 'Fizik I')], [existing])).toEqual([])
  })

  it('numarası tutmayan Türk Dili dersini eşleştirmez', () => {
    expect(autoMatches([source('Türk Dili II')], [plan('TDL101', 'Türk Dili I')], [])).toEqual([])
  })

  it('eşleşen Yalova dersinin konuları plandaki içerikten gelir', () => {
    const [m] = autoMatches([source('Fizik I')], [plan('FIZ101', 'Fizik I', 'Kuvvet\nEnerji')], [])
    expect(m.yalovaTopics['FIZ101|Fizik I'].text).toBe('Kuvvet\nEnerji')
  })
})

describe('noContentNoName (kural 5b)', () => {
  const course: YalovaCourse = { code: 'BSM470', name: 'Oyun Programlama', credit: 3, ects: 5, language: 'TR' }

  it('içeriği yok ve öğrencide aynı adlı ders yoksa işaretlenir', () => {
    expect(noContentNoName(course, sourceNames([source('Game Development')]))).toBe(true)
  })

  it('içeriği yoksa bile adı aynı ders varsa işaretlenmez (adla eşleşir)', () => {
    expect(noContentNoName(course, sourceNames([source('OYUN PROGRAMLAMA')]))).toBe(false)
  })

  it('içeriği varsa işaretlenmez', () => {
    expect(noContentNoName({ ...course, content: 'Oyun motorları' }, sourceNames([]))).toBe(false)
  })
})

describe('sendPlan', () => {
  it('boş ve kullanılmayan satırı göndermez; sıra numaraları gönderilen listeye göredir', () => {
    const blank = emptySource()
    const a = source('Fizik I')
    const b = source('Kimya')
    const { list, indexOf } = sendPlan([blank, a, b], [])
    expect(list).toEqual([a, b])
    expect(indexOf(b.key)).toBe(1)
    expect(indexOf(blank.key)).toBe(-1)
  })

  it('bir eşleştirmede kullanılan satır boş olsa da gönderilir', () => {
    const blank = emptySource()
    const used = { ...emptyMatch(), incoming: [{ key: 1, sourceKey: blank.key, content: '' }] }
    expect(sendPlan([blank], [used]).list).toEqual([blank])
  })
})
