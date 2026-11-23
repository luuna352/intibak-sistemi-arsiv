// api() testleri: CSRF header'ı, JSON gövde ve backend hata mesajının okunması. fetch sahte (vi.fn) olduğu için
// backend çalışmadan test edilir.
import { describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './client'

function fakeFetch(status: number, body?: unknown) {
  const fetch = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetch)
  return fetch
}

describe('api', () => {
  it('GET isteğinde CSRF header\'ı göndermez, JSON cevabı döner', async () => {
    const fetch = fakeFetch(200, { ok: 1 })
    document.cookie = 'XSRF-TOKEN=abc'
    expect(await api('/api/x')).toEqual({ ok: 1 })
    const [, init] = fetch.mock.calls[0]
    expect(init.method).toBe('GET')
    expect(init.headers['X-XSRF-TOKEN']).toBeUndefined()
  })

  it('POST isteğinde cookie\'deki CSRF token\'ını header\'a koyar ve gövdeyi JSON yapar', async () => {
    const fetch = fakeFetch(200, {})
    document.cookie = 'XSRF-TOKEN=t%3D1'
    await api('/api/x', { method: 'POST', body: { a: 1 } })
    const [, init] = fetch.mock.calls[0]
    expect(init.headers['X-XSRF-TOKEN']).toBe('t=1')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe('{"a":1}')
  })

  it('dosya yüklemede (FormData) Content-Type yazmaz, tarayıcıya bırakır', async () => {
    const fetch = fakeFetch(200, {})
    await api('/api/x', { method: 'PUT', body: new FormData() })
    expect(fetch.mock.calls[0][1].headers['Content-Type']).toBeUndefined()
  })

  it('hata cevabındaki Türkçe mesajı ApiError olarak fırlatır', async () => {
    fakeFetch(400, { detail: 'TC Kimlik No geçersiz.' })
    const error = await api('/api/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(400)
    expect((error as ApiError).message).toBe('TC Kimlik No geçersiz.')
  })

  it('204 cevabında gövde okumaz', async () => {
    fakeFetch(204)
    expect(await api('/api/x', { method: 'POST' })).toBeUndefined()
  })
})
