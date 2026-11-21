import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

// Henüz yapılmamış ekranlar için geçici sayfa. Her biri ilgili adımda gerçek sayfayla değişecek.
export default function PlaceholderPage({ title, step }: { title: string; step: string }) {
  return (
    <>
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">Bu ekran {step} yapılacak.</Typography>
      </Paper>
    </>
  )
}
