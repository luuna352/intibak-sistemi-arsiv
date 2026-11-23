# Yalova ders içerikleri (UBYS'den tek seferlik)

Bu klasördeki Word dosyaları, sistemdeki üç ders planının (2021-2022, 2022-2023, 2025-2026) derslerinin konularıdır.
Ayarlar > Ders planları'nda plan açılıp **"İçerik belgesi yükle"** ile yüklenir; önizlemede seçilenler tabloya alınır,
**"Kaydet"** ile kalıcı olur.

## Nereden, nasıl alındı

- **Kaynak:** Yalova Üniversitesi UBYS Eğitim Kataloğu (ubs.yalova.edu.tr, herkese açık), Bilgisayar Mühendisliği
  programı. Her dersin sayfasındaki **"Haftalık Konular"** bölümünün "Teorik" sütunu. Tarih: 23.11.2026.
- Toplu "Ders İçeriği Raporu" personel girişi istediği için kullanılmadı; dersler tek tek okundu.
- Her satır bir konu. Sadece sınav/tekrar yazan satırlar ("Ara Sınav", "Final" gibi) ve aynı satırın tekrarı
  atıldı. Ders kodu gibi başlayan konu satırlarının başına "- " kondu (belge okuyucu yeni ders sanmasın).
- **Hangi UBYS müfredatı:** UBYS'de son 6 yılda 2021-2022, 2023-2024, 2024-2025 ve 2025-2026 planları var.
  2022-2023 için ayrı plan yok; bir önceki yılın planı uygulandığı için o plan da 2021-2022'den başlanarak doldu.
  Bir derste konular boşsa sıradaki (en yakın) müfredattaki aynı dersin konuları alındı.
- **Eşleştirme (bizim planın dersi ↔ UBYS dersi):**
  1. Kod ve ad aynı (ad Türkçe ya da İngilizce karşılığı olabilir),
  2. kod aynı, adın yazımı 1-2 harf farklı (sayılar aynı olmak şartıyla; ör. Makina/Makine),
  3. sadece ad aynı (planlar arasında kod değişmiş; ör. Web Teknolojileri BSM156 ↔ BSM104).
  Sadece kodu aynı, adı farklı olan ders **alınmadı** (başka ders olabilir).
- **Kontrol:** Her Word dosyası uygulamanın kendi belge okuyucusuyla (ContentDocument) tekrar okundu; her dersin
  konuları aynen geri geldi (2021-2022: 85/85, 2022-2023: 87/87, 2025-2026: 78/78).
- Yapay zekâ kullanılmadı; yazılar UBYS'deki haliyle alındı.

İleride uygulamaya UBYS'den doğrudan çekme özelliği eklenecek (AGENTS.md "Sonraya").

## Rapor

## 2021-2022 planı

- Konusu bulunan: 85 ders (75 kod + ad, 2 kod + yazımı az farklı ad, 8 sadece ad ile)
- Bulunamayan: 53 ders; yer tutucu (kodsuz seçmeli) atlanan: 12

### Planda aynı kodlu iki farklı ders (belgeye konmadı)

- BSM449 Sayısal Veri İletişimi (7. yarıyıl)
- BSM449 Bilgisayarlı Görme (7-8. yarıyıl teknik seçmeli)

Yükleme ekranı koda göre eşleştirdiği için içerik iki derse birden yazılırdı. Plandaki kod düzeltilince (UBYS'de Bilgisayarlı Görme = BSM409) ya da içerik elle girilerek tamamlanır.

### Kod aynı, adın yazımı 1-2 harf farklı (kontrol edin)

| Bizim ders | UBYS kaynağı |
|---|---|
| BSM429 Makina Öğrenmesi | 2021-2022 BSM429 Makine Öğrenmesi |
| BSM426 Biyoinformatik | 2021-2022 BSM426 Biyoenformatik |

### Sadece ad ile bulunanlar (kod farklı, kontrol edin)

| Bizim ders | UBYS kaynağı |
|---|---|
| BSM156 Web Teknolojileri | 2021-2022 BSM104 Web Teknolojileri |
| STJ-301 Staj 1 | 2021-2022 STJ-201 Staj 1 |
| STJ-302 Staj 2 | 2021-2022 STJ-202 Staj 2 |
| STJ-401 Staj 3 | 2021-2022 STJ-301 Staj 3 |
| STJ-402 Staj 4 | 2021-2022 STJ-302 Staj 4 |
| BSM405 Ağ Güvenliği | 2021-2022 BSM456 Ağ Güvenliği |
| BSM450 Doğal Dil İşleme | 2021-2022 BSM459 Doğal Dil İşleme |
| SSD150 Bilim ve Teknoloji Tarihi | 2021-2022 ÜSD110 Bilim ve Teknoloji Tarihi |

### Bulunamayanlar (UBYS'de konusu yok ya da eşleşmedi; elle girilir)

| Bizim ders | Yer | Not |
|---|---|---|
| BSM325 Yazılım Tasarım Desenleri | 5-6. yarıyıl teknik seçmeli | Aynı kod: 2021-2022: BSM325 Yazılım Tasarım Desenleri (konusu boş) |
| BSM329 Siber Güvenliğin Temelleri | 5-6. yarıyıl teknik seçmeli | Aynı kod: 2021-2022: BSM329 Siber Güvenliğin Temelleri (konusu boş) |
| BSM328 Yazılım Kalite ve Test Süreci | 5-6. yarıyıl teknik seçmeli | Aynı kod: 2021-2022: BSM328 Yazılım Kalite ve Test Süreci (konusu boş) |
| BSM434 İleri Sayısal Sistem Tasarımı | 7-8. yarıyıl teknik seçmeli | Aynı kod: 2021-2022: BSM434 İleri Sayısal Sistem Tasarımı (konusu boş) |
| BSM406 Dağıtık Sistemler | 7-8. yarıyıl teknik seçmeli |  |
| BSM408 Derleyici Tasarımı | 7-8. yarıyıl teknik seçmeli |  |

47 ders (SSD101-SSD149, sosyal seçmeli): bu havuz UBYS'deki müfredatlarda yok (UBYS'de seçmeli havuzu ÜSD kodlu ve farklı derslerden oluşuyor); içerikleri elle girilir.

## 2022-2023 planı

- Konusu bulunan: 87 ders (76 kod + ad, 2 kod + yazımı az farklı ad, 9 sadece ad ile)
- Bulunamayan: 54 ders; yer tutucu (kodsuz seçmeli) atlanan: 12

### Planda aynı kodlu iki farklı ders (belgeye konmadı)

- BSM449 Sayısal Veri İletişimi (7. yarıyıl)
- BSM449 Bilgisayarlı Görme (7-8. yarıyıl teknik seçmeli)

Yükleme ekranı koda göre eşleştirdiği için içerik iki derse birden yazılırdı. Plandaki kod düzeltilince (UBYS'de Bilgisayarlı Görme = BSM409) ya da içerik elle girilerek tamamlanır.

### Kod aynı, adın yazımı 1-2 harf farklı (kontrol edin)

| Bizim ders | UBYS kaynağı |
|---|---|
| BSM429 Makina Öğrenmesi | 2021-2022 BSM429 Makine Öğrenmesi |
| BSM426 Biyoinformatik | 2021-2022 BSM426 Biyoenformatik |

### Sadece ad ile bulunanlar (kod farklı, kontrol edin)

| Bizim ders | UBYS kaynağı |
|---|---|
| BSM156 Web Teknolojileri | 2021-2022 BSM104 Web Teknolojileri |
| STJ-301 Staj 1 | 2021-2022 STJ-201 Staj 1 |
| STJ-302 Staj 2 | 2021-2022 STJ-202 Staj 2 |
| STJ-401 Staj 3 | 2021-2022 STJ-301 Staj 3 |
| STJ-402 Staj 4 | 2021-2022 STJ-302 Staj 4 |
| BSM405 Ağ Güvenliği | 2021-2022 BSM456 Ağ Güvenliği |
| BSM450 Doğal Dil İşleme | 2021-2022 BSM459 Doğal Dil İşleme |
| BSM457 Veri Bilimine Giriş | 2023-2024 BSM333 Veri Bilimine Giriş |
| SSD150 Bilim ve Teknoloji Tarihi | 2021-2022 ÜSD110 Bilim ve Teknoloji Tarihi |

### Bulunamayanlar (UBYS'de konusu yok ya da eşleşmedi; elle girilir)

| Bizim ders | Yer | Not |
|---|---|---|
| BSM325 Yazılım Tasarım Desenleri | 5-6. yarıyıl teknik seçmeli | Aynı kod: 2021-2022: BSM325 Yazılım Tasarım Desenleri (konusu boş) |
| BSM329 Siber Güvenliğin Temelleri | 5-6. yarıyıl teknik seçmeli | Aynı kod: 2021-2022: BSM329 Siber Güvenliğin Temelleri (konusu boş) |
| BSM331 Siber Güvenlik ve Olay Müdahale | 5-6. yarıyıl teknik seçmeli | Aynı kod: 2021-2022: BSM331 Siber Güvenlik ve Olay Müdahale (konusu boş) |
| BSM328 Yazılım Kalite ve Test Süreci | 5-6. yarıyıl teknik seçmeli | Aynı kod: 2021-2022: BSM328 Yazılım Kalite ve Test Süreci (konusu boş) |
| BSM434 İleri Sayısal Sistem Tasarımı | 7-8. yarıyıl teknik seçmeli | Aynı kod: 2021-2022: BSM434 İleri Sayısal Sistem Tasarımı (konusu boş) |
| BSM406 Dağıtık Sistemler | 7-8. yarıyıl teknik seçmeli |  |
| BSM408 Derleyici Tasarımı | 7-8. yarıyıl teknik seçmeli |  |

47 ders (SSD101-SSD149, sosyal seçmeli): bu havuz UBYS'deki müfredatlarda yok (UBYS'de seçmeli havuzu ÜSD kodlu ve farklı derslerden oluşuyor); içerikleri elle girilir.

## 2025-2026 planı

- Konusu bulunan: 78 ders (66 kod + ad, 0 kod + yazımı az farklı ad, 12 sadece ad ile)
- Bulunamayan: 51 ders; yer tutucu (kodsuz seçmeli) atlanan: 27

### Sadece ad ile bulunanlar (kod farklı, kontrol edin)

| Bizim ders | UBYS kaynağı |
|---|---|
| BSM156 Web Teknolojileri | 2025-2026 BSM104 Web Teknolojileri |
| BSM229 Ayrık Matematik | 2025-2026 MAT205 Ayrık Matematik |
| BSM313 Web Programlama | 2025-2026 BSM308 Web Programlama |
| İSG101 İş Sağlığı ve Güvenliği 1 | 2025-2026 ISG401 İş Sağlığı Ve Güvenliği 1 |
| STJ-301 Staj 2 | 2025-2026 STJ-202 Staj 2 |
| İSG102 İş Sağlığı ve Güvenliği 2 | 2025-2026 ISG402 İş Sağlığı Ve Güvenliği 2 |
| STJ-302 Staj 3 | 2025-2026 STJ-301 Staj 3 |
| STJ-401 Staj 4 | 2025-2026 STJ-302 Staj 4 |
| BSM449 Bilgisayarlı Görme | 2024-2025 BSM409 Bilgisayarlı Görme |
| BSM450 Doğal Dil İşleme | 2024-2025 BSM459 Doğal Dil İşleme |
| BSM404 Ağ Güvenliği | 2024-2025 BSM456 Ağ Güvenliği |
| SSD150 Bilim ve Teknoloji Tarihi | 2025-2026 ÜSD110 Bilim ve Teknoloji Tarihi |

### Bulunamayanlar (UBYS'de konusu yok ya da eşleşmedi; elle girilir)

| Bizim ders | Yer | Not |
|---|---|---|
| BSM325 Yazılım Tasarım Desenleri | 5-6. yarıyıl teknik seçmeli | Aynı kod: 2025-2026: BSM325 Yazılım Tasarım Desenleri (konusu boş) |
| BSM328 Yazılım Kalite ve Test Süreci | 5-6. yarıyıl teknik seçmeli | Aynı kod: 2025-2026: BSM328 Yazılım Kalite ve Test Süreci (konusu boş) |
| BSM329 Siber Güvenliğin Temelleri | 5-6. yarıyıl teknik seçmeli | Aynı kod: 2025-2026: BSM329 Siber Güvenliğin Temelleri (konusu boş) |
| BSM434 İleri Sayısal Sistem Tasarımı | 7-8. yarıyıl teknik seçmeli | Aynı kod: 2024-2025: BSM434 İleri Sayısal Sistem Tasarımı (konusu boş) |

47 ders (SSD101-SSD149, üniversite seçmeli): bu havuz UBYS'deki müfredatlarda yok (UBYS'de seçmeli havuzu ÜSD kodlu ve farklı derslerden oluşuyor); içerikleri elle girilir.
