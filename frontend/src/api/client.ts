// Backend'e istek atan tek yardımcı fonksiyon. Bütün sayfalar bunu kullanır; böylece CSRF token'ı ve hata
// mesajlarının okunması tek yerde yapılır.

/** Backend'in döndürdüğü hata: HTTP durum kodu + ekranda gösterilecek Türkçe mesaj. */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Spring Security'nin yazdığı XSRF-TOKEN cookie'sini okur. GET dışındaki isteklerde header olarak geri gönderilir;
// başka bir site bu cookie'yi okuyamadığı için header'ı da koyamaz (CSRF koruması).
function csrfToken(): string | undefined {
  const cookie = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))
  return cookie ? decodeURIComponent(cookie.substring('XSRF-TOKEN='.length)) : undefined
}

type Options = { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown }

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = {}
  // Dosya yüklemede (FormData) Content-Type yazılmaz: tarayıcı 'multipart/form-data; boundary=...' değerini kendisi koyar.
  const isForm = options.body instanceof FormData
  if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') {
    const token = csrfToken()
    if (token) headers['X-XSRF-TOKEN'] = token
  }

  // credentials: 'same-origin' -> session cookie'si (JSESSIONID) her istekle gönderilir.
  const res = await fetch(path, {
    method,
    headers,
    body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    credentials: 'same-origin',
  })

  if (!res.ok) {
    // Backend hataları ProblemDetail JSON'u döner: { "detail": "Şifre hatalı." ... }
    let message = `İstek başarısız (HTTP ${res.status})`
    try {
      const problem = (await res.json()) as { detail?: string }
      if (problem.detail) message = problem.detail
    } catch {
      // Gövde JSON değilse varsayılan mesaj kalır.
    }
    throw new ApiError(res.status, message)
  }
  // 204 No Content: gövde yok.
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
