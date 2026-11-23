import Tooltip from '@mui/material/Tooltip'
import ErrorIcon from '@mui/icons-material/Error'
import { NO_CONTENT_NO_NAME } from './records'

/**
 * Kural 5b işareti: dersin yanında kırmızı ünlem. Adı karşı derslerle aynı değil (içerik karşılaştırması gerekiyor)
 * ama Yalova dersinin içeriği yok; sistem eşleştirmeyi önermez. Üzerine gelince açıklaması görünür.
 */
export default function NoContentMark() {
  return (
    <Tooltip title={`${NO_CONTENT_NO_NAME}: içerik karşılaştırması yapılamaz. Komisyon isterse konuları elle yazıp karşılaştırabilir ya da yine de sayabilir.`}>
      <ErrorIcon color="error" fontSize="small" aria-label={NO_CONTENT_NO_NAME} sx={{ verticalAlign: 'middle' }} />
    </Tooltip>
  )
}
