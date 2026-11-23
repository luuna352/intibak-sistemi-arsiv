import { useState } from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { courseKey, lines, type EditMatch, type MatchView } from './records'

type Props = {
  match: EditMatch
  // Satırın hesap sonucu (backend): hangi kural ve içerik yüzdesi.
  result: MatchView | undefined
  onChange: (change: Partial<EditMatch>) => void
  disabled: boolean
}

/**
 * Kural 5, içerik karşılaştırması: solda karşı dersin içeriği, sağda Yalova dersinin konuları (her satır bir konu).
 * Komisyon karşı dersin içeriğine bakıp her Yalova konusu için "karşılanıyor" kutusunu işaretler. Yüzde =
 * karşılanan / toplam Yalova konusu (backend hesaplar). Sabit eşik yok: kabul kararı "Sayıldı mı?" kutusuyla
 * komisyonundur. Ad farklıysa (içerik karşılaştırması gereken satır) bölüm açık gelir; diğerlerinde kapalıdır.
 * Yalova dersi kaldırılırsa konuları da kayda gitmez (sadece seçili derslerin konuları gönderilir).
 */
export default function ContentComparison({ match, result, onChange, disabled }: Props) {
  // Kullanıcı açıp kapatmadıysa (null) bölüm satırın kuralını izler: içerik karşılaştırması gerekiyorsa açık.
  const [open, setOpen] = useState<boolean | null>(null)
  const yalovaTopics = match.yalova.flatMap((c) => lines(match.yalovaTopics[courseKey(c)]?.text ?? ''))
  const coveredCount = match.yalova.reduce((sum, c) => {
    const t = match.yalovaTopics[courseKey(c)]
    return sum + (t ? lines(t.text).filter((x) => t.covered.includes(x)).length : 0)
  }, 0)
  const incomingEmpty = match.incoming.every((c) => lines(c.content).length === 0)
  const percent = result?.contentPercent

  // Özet satırı: yüzde ve eksik içerik uyarısı (engel değil, sadece bilgi).
  const summary =
    yalovaTopics.length === 0
      ? 'Yalova dersinin konuları girilmemiş'
      : `Karşılanan Yalova konusu: ${coveredCount} / ${yalovaTopics.length}${percent != null ? ` (%${percent})` : ''}`

  const setYalova = (key: string, text: string, covered: string[]) =>
    onChange({ yalovaTopics: { ...match.yalovaTopics, [key]: { text, covered } } })

  return (
    <Accordion expanded={open ?? result?.basis === 'CONTENT'} onChange={(_, v) => setOpen(v)} disableGutters variant="outlined" sx={{ mt: 1 }}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="body2">
          <b>İçerik karşılaştırması</b> · {summary}
          {incomingEmpty && ' · karşı dersin içeriği girilmemiş'}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {/* Geniş ekranda iki sütun (sol: karşı ders, sağ: Yalova), dar ekranda alt alta. */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box>
            {match.incoming.map((c) => (
              <TextField key={c.key} fullWidth multiline minRows={4} size="small" sx={{ mb: 1 }}
                label={`Karşı ders: ${c.name || '(adsız)'} · içerik`} value={c.content} disabled={disabled}
                placeholder="Her satıra bir konu yazın ya da ders içerik belgesinden yapıştırın"
                onChange={(e) =>
                  onChange({
                    incoming: match.incoming.map((x) => (x.key === c.key ? { ...x, content: e.target.value } : x)),
                  })
                } />
            ))}
          </Box>
          <Box>
            {match.yalova.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Önce Yalova dersini seçin.
              </Typography>
            )}
            {match.yalova.map((c) => {
              const key = courseKey(c)
              const t = match.yalovaTopics[key] ?? { text: '', covered: [] }
              return (
                <Box key={key} sx={{ mb: 2 }}>
                  <TextField fullWidth multiline minRows={4} size="small"
                    label={`Yalova: ${c.code ? c.code + ' ' : ''}${c.name} · konular`} value={t.text} disabled={disabled}
                    placeholder="Her satıra bir konu"
                    onChange={(e) => setYalova(key, e.target.value, t.covered)} />
                  {/* Her Yalova konusu için: karşı derste karşılanıyor mu? (komisyon işaretler) */}
                  {lines(t.text).map((topic, i) => (
                    <FormControlLabel key={`${i}-${topic}`} sx={{ display: 'flex', ml: 0 }}
                      label={<Typography variant="body2">{topic}</Typography>}
                      control={
                        <Checkbox size="small" disabled={disabled} checked={t.covered.includes(topic)}
                          onChange={(e) =>
                            setYalova(key, t.text,
                              e.target.checked ? [...t.covered, topic] : t.covered.filter((x) => x !== topic))
                          } />
                      } />
                  ))}
                </Box>
              )
            })}
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary">
          İşaretli kutu: bu Yalova konusu karşı derste karşılanıyor. Yüzde sadece bilgi içindir, sabit bir eşik yok;
          dersin sayılıp sayılmayacağına komisyon "Sayıldı mı?" kutusuyla karar verir.
        </Typography>
      </AccordionDetails>
    </Accordion>
  )
}
