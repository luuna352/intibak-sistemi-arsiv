// Vitest'in her test dosyasından önce çalıştırdığı hazırlık.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// toBeInTheDocument, toHaveTextContent gibi ekran eşleştiricileri yukarıdaki import ile gelir.
// Her testten sonra: çizilen bileşenler kaldırılır ve sahte (mock) fonksiyonlar sıfırlanır; testler birbirini
// etkilemesin.
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
