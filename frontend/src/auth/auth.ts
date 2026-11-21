import { createContext, useContext } from 'react'

// Rol kodları: backend'deki Role enum'u ile aynı.
export type Role = 'KOMISYON_BASKANI' | 'UYE_1' | 'UYE_2' | 'SEKRETER'

/** Backend'deki UserResponse ile aynı alanlar. */
export type User = {
  role: Role
  roleLabel: string
  displayName: string
  passwordSet: boolean
}

/** Giriş bilgisini tüm sayfalara dağıtan context'in içeriği (değerleri AuthProvider doldurur). */
export type AuthState = {
  user: User | null
  // İlk açılışta "giriş var mı?" kontrolü sürerken true.
  loading: boolean
  // Ekranın üstünde bir kez gösterilecek bilgi mesajı (örn. "Yeni şifreniz kaydedildi").
  notice: string | null
  clearNotice: () => void
  login: (role: Role, password: string) => Promise<void>
  logout: () => Promise<void>
  // Görünen ad değişince üst çubuktaki adı tazelemek için.
  refreshMe: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

// Sayfalar giriş bilgisine bu hook ile ulaşır: const { user, logout } = useAuth()
export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth, AuthProvider içinde kullanılmalı')
  return value
}
