-- Sistem ayarları: anahtar-değer tablosu. Her ayar tek satırdır; değiştirildiğinde herkes aynı değeri görür.
-- İlk ayar: aktif eğitim-öğretim yılı (docs/devir-notu.md 1.4). İleride başka ayarlar da buraya satır olarak eklenir.
CREATE TABLE setting (
    -- Ayarın adı (kodda sabit), örn. 'active_start_year'.
    key             VARCHAR(50)  PRIMARY KEY,
    -- Değer metin olarak saklanır; anlamını ve doğrulamasını ilgili service bilir.
    value           VARCHAR(500) NOT NULL,
    -- Son değiştiren kişinin O ANKİ görünen adı, metin olarak ("fatura mantığı"): rolün adı sonradan değişse de
    -- bu kayıt değişmez. NULL: migration ile gelen varsayılan değer, kimse değiştirmedi.
    updated_by_name VARCHAR(200),
    updated_at      TIMESTAMPTZ
);

-- Aktif yılın ilk yılı. 2026 -> "2026-2027" eğitim yılı. Ayarlar > Aktif eğitim yılı ekranından değiştirilir.
INSERT INTO setting (key, value) VALUES ('active_start_year', '2026');
