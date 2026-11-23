// SameStudentRecords testleri: aynı TC'li diğer kayıtlar sadece TC 11 hane olunca ve yarım saniye bekleyince sorulur.
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SameStudentRecords from './SameStudentRecords'

const other = {
  id: 3, tcMasked: '100•••••146', fullName: 'Deneme Öğrenci', transferType: 'YATAY', transferTypeLabel: 'Yatay geçiş',
  university: 'Deneme Üniversitesi', createdByName: 'Üye 1', createdAt: '2026-11-20T10:00:00Z', updatedByName: null,
  updatedAt: null, status: 'OLUSTURULUYOR', statusLabel: 'Oluşturuluyor',
}

// Adrese göre cevap veren sahte fetch: kayıt listesi ve o kaydın belgeleri (transkript var).
function fakeBackend() {
  const fetch = vi.fn().mockImplementation((url: string) => {
    const body = url.startsWith('/api/records/same-student')
      ? [other]
      : { contentInTranscript: false, documents: [{ kind: 'TRANSCRIPT' }] }
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

describe('SameStudentRecords', () => {
  it('TC eksikken hiç sormaz ve bir şey göstermez', async () => {
    vi.useFakeTimers()
    const fetch = fakeBackend()
    const { container } = render(<SameStudentRecords tcNo="1000000" excludeId={null} />)
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(fetch).not.toHaveBeenCalled()
    expect(container).toBeEmptyDOMElement()
  })

  it('TC tamamsa diğer kaydı, kaydı ve transkripti açma bağlantılarıyla listeler', async () => {
    vi.useFakeTimers()
    const fetch = fakeBackend()
    render(<SameStudentRecords tcNo="10000000146" excludeId={5} />)
    // Yarım saniye dolmadan istek gitmez (yazarken her harfte sorulmasın).
    expect(fetch).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(600))
    expect(fetch.mock.calls[0][0]).toBe('/api/records/same-student?tc=10000000146&excludeId=5')
    expect(screen.getByText(/Deneme Üniversitesi/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kaydı aç' })).toHaveAttribute('href', '/kayitlar/3')
    expect(screen.getByRole('link', { name: 'Transkripti aç' })).toHaveAttribute(
      'href',
      '/api/records/3/documents/TRANSCRIPT/file',
    )
  })
})
