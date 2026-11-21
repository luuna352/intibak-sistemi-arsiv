import { createTheme } from '@mui/material/styles'

// Uygulamanın MUI teması. Renkler mockup'taki mavi-gri tonlardan alındı (üst çubuk #3a8abf).
export const theme = createTheme({
  palette: {
    primary: { main: '#3a8abf' },
    background: { default: '#eef1f5' },
  },
  shape: { borderRadius: 8 },
})
