import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import MenuIcon from '@mui/icons-material/Menu'
import { useAuth } from '../auth/auth'
import { useActiveYear } from '../settings/activeYear'

// Ayarlar menüsünün alt sayfaları (mockup'taki sıra).
const settings = [
  { to: '/ayarlar/kullanicilar', label: 'Kullanıcılar' },
  { to: '/ayarlar/ders-planlari', label: 'Ders planları' },
  { to: '/ayarlar/not-tablolari', label: 'Not tabloları' },
  { to: '/ayarlar/aktif-yil', label: 'Aktif eğitim yılı' },
]

// Girişten sonraki ortak çerçeve: üst çubuk + ☰ ile açılıp kapanan sol menü + sayfa içeriği.
export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, notice, clearNotice } = useAuth()
  const { activeYear } = useActiveYear()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(true)
  // Bir ayar sayfasındaysak Ayarlar grubu açık başlar.
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith('/ayarlar'))

  // Menü satırı: tıklanınca adrese gider, o adresteysek seçili görünür.
  const item = (to: string, label: string, indent = false) => (
    <ListItemButton key={to} component={Link} to={to} selected={pathname === to} sx={{ pl: indent ? 4 : 2 }}>
      <ListItemText primary={label} slotProps={{ primary: { sx: { fontWeight: indent ? 500 : 700 } } }} />
    </ListItemButton>
  )

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menüyü aç/kapat">
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
            İntibak Sistemi
          </Typography>
          {activeYear && (
            <Typography variant="body2" sx={{ mr: 3, display: { xs: 'none', sm: 'block' } }}>
              Aktif yıl: <b>{activeYear.label}</b>
            </Typography>
          )}
          <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
            {user?.displayName}
          </Typography>
          <Button color="inherit" variant="outlined" size="small" onClick={logout}>
            Çıkış yap
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {menuOpen && (
          <Box component="nav" sx={{ width: 270, flexShrink: 0, bgcolor: '#f8f9fb', borderRight: '1px solid #dfe3ea' }}>
            <List disablePadding>
              {item('/kayitlar', 'İntibak kayıtları')}
              {item('/yeni-form', 'Yeni intibak formu')}
              <ListItemButton onClick={() => setSettingsOpen(!settingsOpen)}>
                <ListItemText primary="Ayarlar" slotProps={{ primary: { sx: { fontWeight: 700 } } }} />
                {settingsOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={settingsOpen}>{settings.map((s) => item(s.to, s.label, true))}</Collapse>
              <ListItemButton onClick={logout}>
                <ListItemText primary="Çıkış yap" slotProps={{ primary: { sx: { fontWeight: 700, color: 'error.main' } } }} />
              </ListItemButton>
            </List>
          </Box>
        )}
        <Box component="main" sx={{ flexGrow: 1, p: 3, minWidth: 0 }}>
          {notice && (
            <Alert severity="success" onClose={clearNotice} sx={{ mb: 2 }}>
              {notice}
            </Alert>
          )}
          {children}
        </Box>
      </Box>
    </Box>
  )
}
