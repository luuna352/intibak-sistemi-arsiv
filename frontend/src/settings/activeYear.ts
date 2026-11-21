import { createContext, useContext } from 'react'

// Backend'deki ActiveYearService.ActiveYear ile aynı alanlar.
export type ActiveYear = {
  startYear: number
  label: string
  updatedByName: string | null
  updatedAt: string | null
  classPlans: { classLevel: number; planYear: string }[]
}

/** Aktif yıl bilgisini (üst çubuk + ayar sayfası) paylaşan context. */
export type ActiveYearState = {
  activeYear: ActiveYear | null
  // Ayar sayfası kaydedince yeni değeri buraya verir; üst çubuk da hemen güncellenir.
  setActiveYear: (year: ActiveYear) => void
}

export const ActiveYearContext = createContext<ActiveYearState | null>(null)

export function useActiveYear(): ActiveYearState {
  const value = useContext(ActiveYearContext)
  if (!value) throw new Error('useActiveYear, ActiveYearProvider içinde kullanılmalı')
  return value
}
