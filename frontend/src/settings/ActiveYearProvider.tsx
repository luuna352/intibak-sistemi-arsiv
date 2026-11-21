import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import { ActiveYearContext, type ActiveYear } from './activeYear'

// Girişten sonra aktif yılı bir kez yükler ve alt bileşenlere dağıtır. Değer veritabanında tek yerde olduğu için
// her kullanıcı sayfayı açtığında aynı yılı görür.
export function ActiveYearProvider({ children }: { children: ReactNode }) {
  const [activeYear, setActiveYear] = useState<ActiveYear | null>(null)

  useEffect(() => {
    api<ActiveYear>('/api/settings/active-year')
      .then(setActiveYear)
      // Yüklenemezse üst çubukta yıl görünmez; sayfanın geri kalanı çalışmaya devam eder.
      .catch(() => setActiveYear(null))
  }, [])

  return <ActiveYearContext.Provider value={{ activeYear, setActiveYear }}>{children}</ActiveYearContext.Provider>
}
