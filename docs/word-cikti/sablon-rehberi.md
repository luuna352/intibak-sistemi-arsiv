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

Şablonda sağ taraftaki NOTU hücresi boş ve işaretsiz, ama form gereği doldurulacak (not dönüşümünden gelir), o yüzden
etiket kondu (yanındaki AKTS hücresinin yazı biçimiyle). Soldaki T ve U+L hücreleri örnekte de boş ve transkriptte
bu bilgi yok: `{{s_t}}` ve `{{s_u}}` konmadı, boş kalır (karar, bölüm 6).

Çoklu eşleştirme (2 karşı kurum dersi, 1 Yalova dersi): her satır bir sol ders taşır; sağdaki Yalova hücreleri
dikey birleştirilir ve Yalova dersi bir kez yazılır (karar, bölüm 6).

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

## 6. Kararlar

1. **İmzadaki adlar fiş mantığıyla:** Word'e aktarıldığı andaki görünen ad yazılır ve o çıktıda sabit kalır; üye
   sonradan değişse de eski form değişmez (kayıt listesindeki "kaydı açan / son değiştiren" ile aynı mantık).
2. **Sadece sayılan dersler:** Şablonun başlığı "KARŞILIK SAYILACAK DERSLER" / "MUAF SAYILACAK DERSLER"; komisyonun
   "sayılmaz" dediği dersler Word'e girmez.
3. **Çoklu eşleştirme:** Karşıdaki birden çok ders bizdeki bir derse sayılırsa sağdaki (Yalova) hücreler dikey olarak
   birleştirilir, Yalova dersi tek büyük hücrede bir kez yazılır.
4. **Karşı tarafın T ve U+L sütunları boş kalır:** Şablonun örneğinde de boş; transkriptlerde genelde sadece kredi ve
   AKTS var. Bu yüzden bu iki hücreye etiket konmadı.

## 7. Etiketli şablon (yapıldı)

- Dosya: `backend/src/main/resources/templates/intibak-sablon.docx`. Kaynak: hocanın verdiği `İntibak Formu.docx`
  (bayt bayt aynı iki kopya vardı).
- Sadece `word/document.xml` değişti; diğer bütün parçalar (stiller, yazı tipleri, sayfa ayarı) orijinalle bayt bayt
  aynı. Tablo özellikleri, sütun genişlikleri ve hücre ayarları aynı kaldı.
- Örnek yazının olduğu parçaların yazısı etikete çevrildi, parçanın biçimi (yazı tipi, boyut, sarı yazı + kırmızı
  vurgu) korundu. Vurgu, çıktı üretilirken temizlenecek.
- 5 örnek ders satırından ilki etiketlendi, diğer 4'ü silindi (kod ilk satırı ders sayısı kadar çoğaltacak).
- İmza tablosundaki üç ad etikete çevrildi (`{{baskanAd}}`, `{{uye1Ad}}`, `{{uye2Ad}}`); unvan satırı aynen kaldı.
- Gizli belge bilgisindeki (docProps/core.xml) "son değiştiren" e-posta adresi silindi (repo GitHub'a gidecek;
  görünen içeriği etkilemez).
- **Kayıt türü satırına dokunulmadı:** "DİKEY GEÇİŞ / YATAY GEÇİŞ / YÖS / ÖSS" şablonda işaretli alan değil, sabit
  yazı. Nasıl doldurulacağı hocadan gelecek geçiş türleri listesiyle birlikte netleşecek.

## 8. Açık sorular (hocaya)

1. Geçiş türleri listesi: şablonda DİKEY GEÇİŞ / YATAY GEÇİŞ / YÖS / ÖSS, sistemde Yatay, DGS, Af, YÖS, ÖSYS var.
   Word'de kayıt türü nasıl gösterilecek (sadece seçilen mi, liste içinde işaretli mi)?
2. Karşı dersin "Dersin ait olduğu yarıyıl" bilgisi transkriptten girilecek; formda bunun için alan yok (eklenecek).
