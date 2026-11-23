# Ders eşleştirme kuralları (23 Kasım 2026)

Bu dosya, intibak formunda bir eşleştirme satırının (karşı kurum ders(ler)i ↔ Yalova ders(ler)i) nasıl
değerlendirileceğini tek yerde toplar. **Geçerli olan sadece "Kesin kurallar" bölümüdür**: kullanıcının bu projede
belirlediği kurallar. Hoca özetinden, mevzuattan ya da eski projelerden gelen başka bir şey, kullanıcı onaylamadan
uygulanmaz; onlar en alttaki "Uygulanmayan öneriler" bölümünde soru olarak durur.

## Kullanıcının verdiği kurallar (aynen)

> Bizim üniversitenin derslerinin isimleri aynıysa onları kabul et direkt. Eğer dil uyuşmazlığı varsa karşı tarafın
> dersi İngilizce ve bizimki Türkçeyse kabul olur. Bizimki İngilizce ders onunki Türkçe ders ise kabul olmayacak.
> Türkçe ve tarih dersleri direkt kabul olacak. Ders isimleri aynıysa onlar da kabul olacak. Ders isimleri farklıysa
> işte o zaman ders içeriklerinde karşılaştırmaya gidilecek.

> Karşı ders İngilizceyse ve bizimki Türkçeyse isimler eşleşmeyeceğinden içerik karşılaştırması yapmak doğru olabilir.
> Ama karşı taraf Türkçe bizimki İngilizceyse direkt red. Derslerden hangisi Türkçe hangisi İngilizceyse isminden
> anlaşılıyor. Şu anlık kredi kuralı uygulanmayacak. Hocanın bahsettiği 30-60-90 kuralı geçerli.

## Kesin kurallar

| # | Kural | Sonuç |
|---|---|---|
| 1 | **Dil:** Yalova dersi İngilizce, karşı ders Türkçe | Sistem "sayılmaz" önerir (içeriğe bakılmaz); komisyon yine de sayabilir (kural 8) |
| 2 | **Dil:** karşı ders İngilizce, Yalova dersi Türkçe | Red değil; sonraki kurallara geçilir (adlar farklı dilde olduğu için genelde 5. kurala gider) |
| 2b | **Hazırlık:** karşı ders İngilizceyse öğrenci İngilizce hazırlığı geçmiş (ya da sınavla muaf) olmalı **veya** geldiği bölüm en az %30 İngilizce olmalı. İkisi de yoksa | Sistem o İngilizce ders için "sayılmaz" önerir. Hazırlık ve bölüm dili bilgisi girilmemişse de öyle önerir ve bilgi ister; komisyon yine de sayabilir (kullanıcı onayı: 23 Kasım) |
| 3 | **Türk Dili ve tarih (Atatürk İlkeleri ve İnkılap Tarihi) dersleri** | Doğrudan kabul |
| 4 | **Ders adları aynı** | Doğrudan kabul |
| 5 | **Ders adları farklı** | İki dersin içeriği yan yana karşılaştırılır. Sistem örtüşme yüzdesini gösterir; **kabul kararını komisyon verir** (sabit bir eşik yok) |
| 6 | **Kredi kuralı** | Şimdilik uygulanmaz |
| 7 | **Yerleşim:** sayılan kredi 30'dan az 1. sınıf; 30-60 (ikisi dahil) 2. sınıf 3. dönem; 60'tan fazla 3. sınıf 5. dönem; DGS her zaman 5. dönem | Sistem **önerir**, komisyon sınıfı ve dönemi değiştirebilir (kullanıcı onayı: 23 Kasım) |
| 8 | **Esneklik:** sistem öneri ve kolaylık içindir, işi hızlandırır | Derslerle ilgili her sonuç (sayıldı mı, not, yerleşim) komisyon tarafından değiştirilebilir; kesin kurallar sadece öneriyi belirler, değiştirmeyi engellemez (kullanıcı onayı: 23 Kasım) |

Ek olarak: not, seçilen PT tablosuyla Yalova harfine çevrilir; FD, FF, DZ
notuyla sistem "sayılmaz" önerir (komisyon sayabilir); not girilmemişse ya da tabloda yoksa satır hesaplanamaz ve
sayılamaz (eksik bilgi). "Sayıldı mı?" kutusu satırı silmeden sayımdan çıkarır; komisyon dokunmadıkça kutu sistemin
önerisini izler.

> Kullanıcı (23 Kasım): "Komisyon değiştirebilir olsun. Sistem önersin. Sistemde her şey değiştirilebilir olacak, bu
> derslerle alakalı şeylerde esnek olacak yani. Öneri ve kolaylık için yapılıyor bu sistem, işleri hızlandırmak için."

## Uygulama ayrıntıları

- **Dersin dili:** adından anlaşılır; formdaki "Dil" alanını (TR/EN) komisyon ada bakarak seçer.
- **"Ad aynı" nasıl anlaşılır:** büyük/küçük harf, baştaki ve sondaki boşluklar, birden fazla boşluk ve noktalama
  farkı yok sayılır (Türkçe harf kuralıyla: "İ" ile "i" aynı); sondaki I, II, III, IV ile 1, 2, 3, 4 aynı sayılır.
  Örnek: "Veri Yapıları" = "veri  yapıları", "Fizik I" = "Fizik 1". Kelime farkı aynı sayılmaz.
- **Birden çok dersli satır:** her Yalova dersinin karşı tarafta aynı adlı bir dersi varsa 4. kural tutar; yoksa
  satır içerik karşılaştırmasına gider.
- **Türk Dili ve tarih dersi nasıl tanınır:** Yalova dersinin adında "Türk Dili", "Atatürk" ya da "İnkılap" geçer.
  Satırdaki bütün Yalova dersleri böyleyse 3. kural tutar.
- **İçerik karşılaştırması:** solda karşı dersin içeriği, sağda Yalova dersinin konuları (bir satır bir konu).
  Komisyon karşı dersin içeriğine bakıp her Yalova konusu için "karşılanıyor" kutusunu işaretler. Yüzde =
  karşılanan Yalova konusu / toplam Yalova konusu. İçerik girilmemişse sistem bunu yazar, ama kararı yine komisyon
  verir.
- **İçerikler nereden gelir:** Yalova'nın ders içerik belgesi (PDF ya da DOCX) bir kez yüklenir, her plan dersinin
  konuları kaydedilir. Öğrencinin ders içerik belgesi (PDF ya da DOCX) kayda yüklenir; sistem karşı dersin bölümünü
  belgede bulur. İkisi de elle düzeltilebilir ya da yapıştırılabilir. Konular kayda kopya olarak saklanır.

## Uygulama planı (dal: `feature/icerik-karsilastirma`)

- **A1:** kurallar 1-5 ve formda içerik karşılaştırma bölümü (V8: her dersin konuları, Yalova konularında
  "karşılanıyor" işareti).
- **A2:** Yalova ders içerikleri: plan başına konular, Ayarlar > Ders planları'nda düzenleme ve belge yükleme; formda
  Yalova dersi seçilince konuları kendiliğinden gelir.
- **A3:** öğrencinin ders içerik belgesi: kayda PDF/DOCX yükleme, "Belgede bul" ile karşı dersin bölümünü getirme.
  Taranmış (resim) PDF okunmaz, içerik elle yapıştırılır.

## Teyit edilecekler

- **DGS = 5. dönem:** hoca "5. dönem miydi tam emin değilim, Aykut Bey'e / yönetmeliğe sorun" dedi. Sistem şu an DGS'yi
  5. döneme yerleştiriyor; Aykut Bey'e sorulacak.

## Uygulanmayan öneriler (kullanıcı onaylarsa eklenir)

Bunlar hocanın ses kaydı özetinden (23 Kasım) ya da Senato Esasları'ndan geliyor; **şu an uygulanmıyor**.

1. ~~Hazırlık şartı~~: kullanıcı onayladı, kesin kural 2b oldu.
2. **İçerik bulunamazsa ders sayılmaz (hoca özeti):** şu an sadece uyarı yazılır, karar komisyonda.
3. **Sabit eşik (Senato Esasları 5/h: %75):** kullanıcı "eşik yok, komisyon karar versin" dedi.
4. **Kredi kuralı (Senato Esasları 5/g, 5/j):** sonra.
5. **Girilen notlara göre PT tablosu önerisi (hoca özeti):** 87 → PT1, A- → PT2, B1 → PT3.
6. **Sadece sayılan dersler Word formuna yazılır (hoca özeti):** Word adımında sorulacak.
