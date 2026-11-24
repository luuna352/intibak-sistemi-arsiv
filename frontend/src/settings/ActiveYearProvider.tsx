import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import { ActiveYearContext, type ActiveYear } from './activeYear'

// Başka bir kullanıcı aktif yılı değiştirirse açık sayfalar bu kadar süre içinde yeni yılı görür (milisaniye).
export const REFRESH_MS = 30_000

/**
 * Girişten sonra aktif yılı yükler ve alt bileşenlere dağıtır. Değer veritabanında tek yerde durur; hoca "tüm
 * kullanıcılara anlık yansısın" dediği için sadece girişte değil, 30 saniyede bir ve kullanıcı sekmeye geri
 * döndüğünde de yeniden okunur. Böylece bir üye yılı değiştirince diğerleri sayfayı yenilemeden yeni yılı görür.
 */
export function ActiveYearProvider({ children }: { children: ReactNode }) {
  const [activeYear, setActiveYear] = useState<ActiveYear | null>(null)

  useEffect(() => {
    const load = () =>
      api<ActiveYear>('/api/settings/active-year')
        // Değer aynıysa eski nesne kalır: yeni nesne verilirse aktif yıla bağlı ekranlar (örn. yeni formda
        // önceden seçilen plan) her yenilemede baştan çalışır ve kullanıcının seçimini bozardı.
        .then((next) => setActiveYear((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next)))
        // Okunamazsa eldeki değer kalır (ilk yüklemede üst çubukta yıl görünmez); sayfa çalışmaya devam eder.
        .catch(() => {})

    load()
    const timer = setInterval(load, REFRESH_MS)
    // Kullanıcı başka sekmeden/pencereden dönünce beklemeden güncellensin.
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    // Sayfadan çıkışta (çıkış yapınca) zamanlayıcı ve dinleyiciler kapatılır.
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [])

  return <ActiveYearContext.Provider value={{ activeYear, setActiveYear }}>{children}</ActiveYearContext.Provider>
}
