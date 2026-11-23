// documents.ts testleri: dosya boyutu yazımı ve yeni kayıtta bekleyen belgelerin yüklenme sırası.
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_PENDING, formatSize, uploadPending } from './documents'

describe('formatSize', () => {
  it('1 MB altını KB, üstünü virgüllü MB yazar', () => {
    expect(formatSize(500)).toBe('1 KB')
    expect(formatSize(300 * 1024)).toBe('300 KB')
    expect(formatSize(1.5 * 1024 * 1024)).toBe('1,5 MB')
  })
})

describe('uploadPending', () => {
  // Her isteğin adresini ve yöntemini kaydeden sahte fetch.
  function recordCalls(status = 200) {
    const fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ contentInTranscript: false, documents: [], detail: 'Hata' }), { status })),
    )
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  const file = (name: string) => new File(['x'], name, { type: 'application/pdf' })

  it('önce transkripti, sonra içerik belgesini yükler', async () => {
    const fetch = recordCalls()
    const error = await uploadPending(7, { ...EMPTY_PENDING, transcript: file('t.pdf'), content: file('c.pdf') })
    expect(error).toBeNull()
    expect(fetch.mock.calls.map((c) => c[0])).toEqual([
      '/api/records/7/documents/TRANSCRIPT',
      '/api/records/7/documents/CONTENT',
    ])
  })

  it('içerikler transkriptteyse içerik belgesi yerine işareti gönderir', async () => {
    const fetch = recordCalls()
    await uploadPending(7, { transcript: file('t.pdf'), content: file('c.pdf'), contentInTranscript: true })
    expect(fetch.mock.calls.map((c) => c[0])).toEqual([
      '/api/records/7/documents/TRANSCRIPT',
      '/api/records/7/documents/content-in-transcript',
    ])
    expect(fetch.mock.calls[1][1].body).toBe('{"value":true}')
  })

  it('bekleyen dosya yoksa hiç istek atmaz', async () => {
    const fetch = recordCalls()
    expect(await uploadPending(7, EMPTY_PENDING)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('yükleme başarısızsa hata mesajını döner (kayıt yine açılmış olur)', async () => {
    recordCalls(400)
    expect(await uploadPending(7, { ...EMPTY_PENDING, transcript: file('t.pdf') })).toBe('Hata')
  })
})
