import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { Navigate, Route, Routes } from 'react-router'
import { useAuth } from './auth/auth'
import Layout from './components/Layout'
import ActiveYearPage from './pages/ActiveYearPage'
import GradeTablesPage from './pages/GradeTablesPage'
import LoginPage from './pages/LoginPage'
import PlansPage from './pages/PlansPage'
import RecordFormPage from './pages/RecordFormPage'
import RecordsPage from './pages/RecordsPage'
import RecordStatusPage from './pages/RecordStatusPage'
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
          <Route path="/kayitlar" element={<RecordsPage />} />
          <Route path="/kayitlar/:id" element={<RecordFormPage />} />
          <Route path="/yeni-form" element={<RecordFormPage />} />
          <Route path="/ayarlar/kullanicilar" element={<UsersPage />} />
          <Route path="/ayarlar/ders-planlari" element={<PlansPage />} />
          <Route path="/ayarlar/not-tablolari" element={<GradeTablesPage />} />
          <Route path="/ayarlar/aktif-yil" element={<ActiveYearPage />} />
          <Route path="/kayit-durumlari" element={<RecordStatusPage />} />
          <Route path="*" element={<Navigate to="/kayitlar" replace />} />
        </Routes>
      </Layout>
    </ActiveYearProvider>
  )
}
