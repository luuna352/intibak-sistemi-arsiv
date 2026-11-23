// gradeTable.ts testleri: not tablosu satırlarının ekranda yazılışı ve ekrandan backend'e çevrilmesi.
import { describe, expect, it } from 'vitest'
import { sourceCells, toEditRow, toRowInput } from './gradeTable'

describe('sourceCells', () => {
  it("100'lükte aralığı, tek sayıyı ya da özel notu yazar", () => {
    const row = { sourceLetter: null, sourceMin: 90, sourceMax: 100, targetLetter: 'AA', targetPoints: 4 }
    expect(sourceCells('SCORE', row)).toEqual(['90-100'])
    expect(sourceCells('SCORE', { ...row, sourceMin: 100, sourceMax: 100 })).toEqual(['100'])
    expect(sourceCells('SCORE', { ...row, sourceLetter: 'DEVAMSIZ', sourceMin: null, sourceMax: null })).toEqual(['DEVAMSIZ'])
  })

  it('harf ve sayı tablosunda sayısı olmayan not için çizgi koyar', () => {
    const row = { sourceLetter: 'F0', sourceMin: null, sourceMax: null, targetLetter: 'FF', targetPoints: 0 }
    expect(sourceCells('LETTER_NUMBER', row)).toEqual(['F0', '—'])
    expect(sourceCells('LETTER_NUMBER', { ...row, sourceLetter: 'A-', sourceMin: 3.7 })).toEqual(['A-', '3.70'])
  })
})

describe('toRowInput', () => {
  it("100'lükte virgüllü ve boşluklu aralığı okur", () => {
    expect(toRowInput('SCORE', { source: '85,5 - 89', number: '', targetLetter: 'BA' })).toEqual({
      sourceLetter: null,
      sourceMin: 85.5,
      sourceMax: 89,
      targetLetter: 'BA',
    })
  })

  it("100'lükte sayı değilse özel not sayar", () => {
    expect(toRowInput('SCORE', { source: 'DEVAMSIZ', number: '', targetLetter: 'FF' })).toMatchObject({
      sourceLetter: 'DEVAMSIZ',
      sourceMin: null,
    })
  })

  it('harf ve sayıyı alt-üst sınır olarak aynı sayıyla gönderir; ekrana geri çevirince aynı kalır', () => {
    const input = toRowInput('LETTER_NUMBER', { source: 'B+', number: '3,3', targetLetter: 'BA' })
    expect(input).toEqual({ sourceLetter: 'B+', sourceMin: 3.3, sourceMax: 3.3, targetLetter: 'BA' })
    expect(toEditRow('LETTER_NUMBER', { ...input, targetLetter: 'BA', targetPoints: 3.5 })).toEqual({
      source: 'B+',
      number: '3.30',
      targetLetter: 'BA',
    })
  })
})
