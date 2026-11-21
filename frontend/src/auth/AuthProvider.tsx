import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError } from '../api/client'
import { AuthContext, type Role, type User } from './auth'

type LoginResponse = { user: User; passwordCreated: boolean }

// Giriş durumunu tutar ve giriş/çıkış işlemlerini yapar. App bileşeninin tamamını sarar.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  // Giriş yapmış kullanıcıyı backend'e sorar. 401 = giriş yok (hata değil).
  const loadMe = useCallback(async () => {
    try {
      setUser(await api<User>('/api/auth/me'))
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setUser(null)
      else throw e
    }
  }, [])

  // Sayfa ilk açıldığında: önce CSRF cookie'si alınır (giriş POST'u için gerekli), sonra oturum kontrol edilir.
  // Sayfa yenilense de session cookie'si durduğu için kullanıcı girişte kalır.
  useEffect(() => {
    api<void>('/api/auth/csrf')
      .then(loadMe)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [loadMe])

  const login = useCallback(async (role: Role, password: string) => {
    const res = await api<LoginResponse>('/api/auth/login', { method: 'POST', body: { role, password } })
    setUser(res.user)
    if (res.passwordCreated) setNotice('Yeni şifreniz kaydedildi. Bundan sonra bu şifreyle giriş yapacaksınız.')
  }, [])

  const logout = useCallback(async () => {
    await api<void>('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setNotice(null)
    // Çıkışta CSRF cookie'si silinir; bir sonraki giriş için yenisi alınır.
    await api<void>('/api/auth/csrf')
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, loading, notice, clearNotice: () => setNotice(null), login, logout, refreshMe: loadMe }}
    >
      {children}
    </AuthContext.Provider>
  )
}
