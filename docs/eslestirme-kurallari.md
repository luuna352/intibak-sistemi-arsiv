# Ders eşleştirme kuralları (komisyon kararı, 23 Kasım 2026)

Bu dosya, intibak formunda bir eşleştirme satırının (karşı kurum ders(ler)i ↔ Yalova ders(ler)i) **ne zaman kabul
edileceğini** tek yerde toplar. Kurallar kullanıcının (komisyon adına) 23 Kasım 2026'da verdiği tarife göredir.
Dayanak: Ders Eşdeğerlik ve İntibak İşlemlerine İlişkin Senato Esasları (SE), Madde 5.

## Kullanıcının verdiği kurallar (aynen)

> Bizim üniversitenin derslerinin isimleri aynıysa onları kabul et direkt. Eğer dil uyuşmazlığı varsa karşı tarafın
> dersi İngilizce ve bizimki Türkçeyse kabul olur. Bizimki İngilizce ders onunki Türkçe ders ise kabul olmayacak.
> Türkçe ve tarih dersleri direkt kabul olacak. Ders isimleri aynıysa onlar da kabul olacak. Ders isimleri farklıysa
> işte o zaman ders içeriklerinde karşılaştırmaya gidilecek.

## Kurallar, uygulanma sırasıyla

| # | Kural | Sonuç | Dayanak |
|---|---|---|---|
| 1 | **Not:** karşı notu seçilen PT tablosuyla Yalova harfine çevrilir. FD, FF, DZ ya da tabloda olmayan not | Sayılmaz | SE 9, EK-1 |
| 2 | **Dil:** Yalova dersi İngilizce, karşı ders Türkçe | Sayılmaz | Kullanıcı; SE 5/c |
| 2 | **Dil:** karşı ders İngilizce, Yalova dersi Türkçe | Sorun değil, sonraki kurala geçilir | Kullanıcı |
| 3 | **Ortak dersler:** Yalova dersi Türk Dili ya da Atatürk İlkeleri ve İnkılap Tarihi | Doğrudan kabul (içerik karşılaştırması yok) | Kullanıcı; SE 5/b |
| 4 | **Ders adı aynı:** karşı dersin adı Yalova dersinin adıyla aynı | Doğrudan kabul (içerik karşılaştırması yok) | Kullanıcı |
| 5 | **Ders adı farklı:** iki dersin haftalık konuları karşılaştırılır. Yalova dersinin konularının en az %75'i karşı derste karşılanmalı | %75 ve üstü kabul, altı sayılmaz. Konular girilmemişse "içerik karşılaştırması gerekli" | Kullanıcı; SE 5/h |

Kural 1 ve 2 her satırda çalışır. Kural 3 ya da 4 tutarsa kural 5'e bakılmaz.

## Uygulama ayrıntıları (öneri, komisyonca doğrulanacak)

- **"Ad aynı" nasıl anlaşılır:** büyük/küçük harf, baştaki ve sondaki boşluklar, birden fazla boşluk ve noktalama
  farkı yok sayılır (Türkçe harf kuralıyla: "İ" ile "i" aynı). Örnek: "Veri Yapıları" = "veri  yapıları". Kelime farkı
  aynı sayılmaz: "Matematik 1" ≠ "Calculus 1" (bunlar içerik karşılaştırmasına gider).
- **Birden çok dersli satır:** çoğa-bir ya da bire-çok satırda her Yalova dersinin karşı tarafta aynı adlı bir
  dersi varsa ad kuralı tutar; yoksa satır içerik karşılaştırmasına gider.
- **Ortak ders:** Yalova dersinin adında "Türk Dili" ya da "Atatürk İlkeleri" / "İnkılap Tarihi" geçmesiyle tanınır.
  Satırdaki bütün Yalova dersleri ortak dersse kural 3 tutar.
- **İçerik yüzdesi:** payda Yalova dersinin haftalık konu sayısıdır. Sınav ve tekrar haftaları konu listesine
  yazılmaz. Komisyon her Yalova konusunun karşısına, onu karşılayan karşı konuyu seçer; sistem yüzdeyi hesaplar.
  Konu benzerliğini otomatik bulma (yapay zekâ) 2. dönem işidir.

## Açık sorular

1. Kredi kuralı (SE 5/g: karşı dersin kredisi Yalova dersinin en az %65'i; kredi yoksa SE 5/j: AKTS en az %75)
   uygulansın mı? Kullanıcının tarifinde yok.
2. Ortak derste karşı dersin de Türk Dili / tarih dersi olduğunu sistem mi kontrol etsin, komisyon mu?
3. Bağımsız laboratuvar ve proje dersleri (SE 5/ı) için ayrı kural gerekiyor mu?
4. Yerleşim: hocanın verdiği 30 / 60 kredi sınırları ile SE 6/b'deki "toplam kredinin yarısından en az bir fazla"
   formülü farklı. Hangisi geçerli?

## Uygulama planı

**A. Kurallar ve içerik karşılaştırması** (tek commit)
- V8 migration: `intibak_match_topic` (satırın konuları: taraf, sıra, konu metni, Yalova konusunu karşılayan karşı
  konu). Konular kayda kopya olarak saklanır.
- `MatchCalculator`: kural 3, 4, 5; her satır için "kabul sebebi" (ortak ders / ad aynı / içerik %X).
- Form: her satırda kabul sebebi etiketi. Adlar farklıysa "İçerikleri karşılaştır" bölümü: solda karşı dersin
  konuları, sağda Yalova dersinin konuları ve her birinin yanında "karşılayan konu" seçimi; satır ekleme ve silme.
- Testler: ad aynı, ad farklı + %75 altı ve üstü, ortak ders, dil kuralının iki yönü.

**B. Ders içeriği arşivi** (ayrı commit, sonra)
- Yalova derslerinin haftalık konuları bir kere girilir, karşılaştırmada kendiliğinden dolar.
- Daha önce gelmiş üniversitelerin ders içerikleri üniversite / bölüm / yıl bazında saklanır.
