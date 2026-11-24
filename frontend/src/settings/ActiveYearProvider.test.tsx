// ActiveYearProvider testleri: başka bir kullanıcının değiştirdiği aktif yıl, sayfa yenilenmeden görünür.
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ActiveYearProvider, REFRESH_MS } from './ActiveYearProvider'
import { useActiveYear, type ActiveYear } from './activeYear'

const year = (startYear: number): ActiveYear => ({
  startYear, label: `${startYear}-${startYear + 1}`, updatedByName: 'Üye 1', updatedAt: null, classPlans: [],
})

// Sahte backend: aktif yıl her istekte "current" neyse onu döner (başka kullanıcı değiştirince değişir).
let current = year(2026)
function fakeBackend() {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(current))))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

// Üst çubuk gibi aktif yılı gösteren bileşen.
function Shown() {
  const { activeYear } = useActiveYear()
  return <span>{activeYear?.label ?? 'yok'}</span>
}

describe('ActiveYearProvider', () => {
  it('yıl değişince belli aralıkla yeniden okur ve yeni yılı gösterir', async () => {
    vi.useFakeTimers()
    current = year(2026)
    const fetch = fakeBackend()
    render(<ActiveYearProvider><Shown /></ActiveYearProvider>)
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(screen.getByText('2026-2027')).toBeInTheDocument()

    // Başka bir üye yılı değiştirdi.
    current = year(2027)
    await act(() => vi.advanceTimersByTimeAsync(REFRESH_MS))
    expect(screen.getByText('2027-2028')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('sekmeye dönülünce beklemeden yeniden okur', async () => {
    vi.useFakeTimers()
    current = year(2026)
    const fetch = fakeBackend()
    render(<ActiveYearProvider><Shown /></ActiveYearProvider>)
    await act(() => vi.advanceTimersByTimeAsync(0))
    current = year(2028)
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(screen.getByText('2028-2029')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
