import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { Navigate, Route, Routes } from 'react-router'
import { useAuth } from './auth/auth'
import Layout from './components/Layout'
import ActiveYearPage from './pages/ActiveYearPage'
import GradeTablesPage from './pages/GradeTablesPage'
import LoginPage from './pages/LoginPage'
import PlaceholderPage from './pages/PlaceholderPage'
import UsersPage from './pages/UsersPage'
import { ActiveYearProvider } from './settings/ActiveYearProvider'

// Sayfa yönlendirmesi: giriş yoksa her adreste giriş ekranı, varsa menülü çerçeve içinde ilgili sayfa.
export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    )
  }
  if (!user) return <LoginPage />

  return (
    // ActiveYearProvider girişten sonra açılır, çünkü /api/settings/active-year giriş gerektirir.
    <ActiveYearProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/kayitlar" replace />} />
          <Route path="/kayitlar" element={<PlaceholderPage title="İntibak kayıtları" step="Adım 6'da" />} />
          <Route path="/yeni-form" element={<PlaceholderPage title="Yeni intibak formu" step="Adım 6'da" />} />
          <Route path="/ayarlar/kullanicilar" element={<UsersPage />} />
          <Route path="/ayarlar/ders-planlari" element={<PlaceholderPage title="Ders planları" step="Adım 5'te" />} />
          <Route path="/ayarlar/not-tablolari" element={<GradeTablesPage />} />
          <Route path="/ayarlar/aktif-yil" element={<ActiveYearPage />} />
          <Route path="/kayit-durumlari" element={<PlaceholderPage title="Kayıt durumları" step="Adım 6'da" />} />
          <Route path="*" element={<Navigate to="/kayitlar" replace />} />
        </Routes>
      </Layout>
    </ActiveYearProvider>
  )
}
