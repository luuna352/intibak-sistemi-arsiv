// Plan ekranındaki ders satırının tipi ve konu yardımcıları (PlansPage ve PlanCourseRow birlikte kullanır).

// Ekranda düzenlenen ders: kutular metin tutar, kaydederken sayıya çevrilir. key: React'in satırları ayırt etmesi
// için sabit numara (satır silinince/eklenince kutuların karışmaması için dizideki sıra kullanılmaz).
export type EditRow = {
  key: number
  semester: string
  groupName: string
  code: string
  name: string
  zs: 'Z' | 'S'
  language: 'TR' | 'EN'
  theory: string
  practice: string
  credit: string
  ects: string
  content: string
}

// İçerikteki konular: her satır bir konu, boş satırlar atlanır.
export const topicsOf = (content: string) => content.split('\n').map((x) => x.trim()).filter((x) => x !== '')
// İçerik kutusundaki konu sayısı (boş satırlar sayılmaz).
export const topicCount = (content: string) => topicsOf(content).length
