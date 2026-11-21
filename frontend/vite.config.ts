import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Vite ayarı: geliştirme sunucusu (npm run dev, port 5173) ve build.
export default defineConfig({
  plugins: [react()],
  server: {
    // Geliştirmede /api istekleri Spring Boot'a (8080) yönlendirilir.
    // Böylece tarayıcı açısından frontend ve backend aynı adrestedir (ileride session cookie çalışsın diye).
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    // Çıktı: frontend/dist (statik dosyalar)
    outDir: 'dist',
    // MUI ile tek JS dosyası ~500 kB oluyor; iç ağda kullanılan bir uygulama için kabul edilebilir.
    chunkSizeWarningLimit: 1000,
  },
})
