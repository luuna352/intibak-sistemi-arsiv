# İntibak formu Word şablonu: hazırlama rehberi

Kaynak şablon: `İntibak Formu.docx`. Çıktı: düzenlenebilir `.docx`.

## 1. Şablonda ne bulundu

- "Turuncu" alanlar aslında **sarı yazı rengi (FFFF00) + kırmızı vurgu (highlight)** ile işaretli. Toplam 164 işaretli parça var.
- 2 tablo var: (1) ders eşleştirme tablosu, (2) alttaki imza tablosu. Üst bilgi bölümü (öğrenci bilgileri) ilk tablonun ilk satırında.
- Örnek ders satırı 5 tane (satır 4-8). Her satır 16 hücre: sol 8 (karşı kurum), sağ 8 (Yalova).
- Aynı alan Word içinde **birden çok parçaya bölünmüş** (örnek: `202` + `2` + ` - ` + `202` + `3`). Bu yüzden etiket yazarken bu parçalar tek parça haline getirilir (aşağıda).
- Senato dipnotu ve imza unvanları (İntibak Komisyonu Başkanı, Üye, Üye) sabit, dokunulmaz.

## 2. Etiket formatı

Etiketler `{{ad}}` biçiminde, düz metin olarak yazılır. Python'daki docxtpl'in `{{ }}` sözdizimiyle aynıdır, ama projemiz Java olduğu için okuma/yazmayı Apache POI (XWPF) yapar.

## 3. Şablonda yapılacak değişiklikler

### 3.1 Üst bilgi (1. tablo, 1. satır)

Her etiket için: işaretli örnek metnin tamamını sil, yerine etiketi **tek seferde yaz** (yazarken ortada biçim değiştirme). Rengi sarıya/vurguya çevirmene gerek yok, kod çıktıda vurguyu zaten temizler.

| Şablondaki satır | Yeni hali |
|---|---|
| `⟦2022⟧ - ⟦2023⟧ EĞİTİM - öğretim yılı` | `{{aktifYil}} EĞİTİM - öğretim yılı` |
| `adı – soyadı : ⟦sdfsdfsdf⟧` | `adı – soyadı : {{adSoyad}}` |
| `t.c. nO : ⟦1234⟧` | `t.c. nO : {{tcNo}}` |
| `Yerleştiği sınıf : ⟦2⟧⟦. SINIF⟧` | `Yerleştiği sınıf : {{yerlesilenSinif}}` (kod "2. SINIF" yazar) |
| `KAYIT TÜRÜ : DİKEY GEÇİŞ / YATAY GEÇİŞ / YÖS / ÖSS` | `KAYIT TÜRÜ : {{kayitTuru}}` (sabit liste silinir, sadece seçilen yazılır) |
| `...yerleştiği kayıt tarihi: ⟦11/08/2017⟧` | `...yerleştiği kayıt tarihi: {{oncekiKayitTarihi}}` |

### 3.2 Sol/sağ başlık (1. tablo, 2. satır)

| Hücre | Yeni hali |
|---|---|
| Sol (karşı kurum) | `{{gelinenKurum}}` + altına sabit "ALMIŞ VE BAŞARILI OLDUĞU DERSLERDEN KARŞILIK SAYILACAK DERSLER". `{{gelinenKurum}}` değeri üniversite + fakülte/yüksekokul + bölüm/program adı + " BÖLÜMÜ" olarak kodda birleştirilir. |
| Sağ (Yalova) | Sabit kalır (Yalova Üniversitesi Mühendislik Fakültesi Bilgisayar Mühendisliği). |

### 3.3 Ders satırları (1. tablo, satır 4-8)

- **Sadece 1 örnek satır bırak** (satır 4), diğer 4 satırı sil. Kod bu satırı ders sayısı kadar çoğaltır.
- Satırdaki 16 hücreye şu etiketler yazılır:

| Sol 8 hücre (karşı kurum) | Sağ 8 hücre (Yalova) |
|---|---|
| `{{s_kod}}` Ders kodu | `{{y_kod}}` |
| `{{s_yariyil}}` Yarıyıl | `{{y_yariyil}}` |
| `{{s_ad}}` Ders adı | `{{y_ad}}` |
| `{{s_t}}` Teorik | `{{y_t}}` |
| `{{s_u}}` Uygulama (U+L) | `{{y_u}}` |
| `{{s_kredi}}` Kredi | `{{y_kredi}}` |
| `{{s_akts}}` AKTS | `{{y_akts}}` |
| `{{s_not}}` Harf notu | `{{y_not}}` Karşılık harf notu |

Şablonda sağ taraftaki NOTU hücresi boş ve işaretsiz, ama form gereği doldurulacak (not dönüşümünden gelir), o yüzden etiket konmalı. Soldaki T ve U+L hücreleri de örnekte boş, ama etiket konmalı.

Çoklu eşleştirme (2 karşı kurum dersi, 1 Yalova dersi): her satır "bir sol + bir sağ" taşır. Fazla sol dersler için sağ hücreler boş bırakılır (veya ilk sağ ders tekrarlanmaz, boş kalır).

### 3.4 İmza tablosu (2. tablo)

| Hücre | Yeni hali |
|---|---|
| 1. satır, 1. hücre (Başkan adı) | `{{baskanAd}}` |
| 1. satır, 2. hücre | `{{uye1Ad}}` |
| 1. satır, 3. hücre | `{{uye2Ad}}` |
| 2. satır (unvanlar) | Sabit kalır |

Değer, Ayarlar > Kullanıcılar ekranındaki "Ekranda görünen ad" metnidir (ör. "Dr. Öğr. Üyesi Ad SOYAD", unvanıyla birlikte).

## 4. Etiket listesi (özet)

`aktifYil`, `adSoyad`, `tcNo`, `yerlesilenSinif`, `kayitTuru`, `oncekiKayitTarihi`, `gelinenKurum`, `baskanAd`, `uye1Ad`, `uye2Ad` + ders satırı etiketleri: `s_kod, s_yariyil, s_ad, s_t, s_u, s_kredi, s_akts, s_not, y_kod, y_yariyil, y_ad, y_t, y_u, y_kredi, y_akts, y_not`.

## 5. Dikkat edilecekler

- Etiketi yazarken ortasında biçim değiştirme, yazım denetimi altı çizgisine aldırma. Bölünse bile kod paragraf içinde parçaları birleştirir, ama tek parça yazmak daha güvenli.
- Satırın başka bir yerinde `{{` kullanma.
- Sarı yazı + kırmızı vurgu çıktıda temizlenir (form yazdırılabilir görünsün diye), şablonda kalabilir.
- Şablon dosyası projede `backend/src/main/resources/templates/intibak-sablon.docx` yoluna konur.

## 6. Açık kararlar (hocaya/sana soru)

1. Komisyon üyelerinin adları form oluşturulurken mi, Word'e aktarırken mi yazılsın? Kayıt listesindeki "fatura mantığı" gibi aktarım anındaki adı kayda dondurmak daha güvenli.
2. Kayıt türü listesi (DGS/YATAY GEÇİŞ/YÖS/ÖSS) formda hep tam liste mi kalsın, yoksa sadece seçilen mi yazılsın? Rehber "sadece seçilen" varsayıyor.
3. Çoklu eşleştirmede satır birleştirme (dikey birleştirme) istenir mi, yoksa boş hücre yeterli mi?
