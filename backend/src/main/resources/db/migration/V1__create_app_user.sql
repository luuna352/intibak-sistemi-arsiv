-- Sistemi kullanan 4 sabit rol hesabı (docs/devir-notu.md 1.1). Şahıs hesabı yoktur: komisyon üyesi değişince yeni
-- hesap açılmaz, rolün "ekranda görünen ad"ı (unvan + ad-soyad) güncellenir. 4 rolün yetkisi eşittir.
CREATE TABLE app_user (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Rol kodu (Java'daki Role enum'u). Her rolden tek hesap olur (UNIQUE); geçersiz değeri veritabanı reddeder.
    role          VARCHAR(30)  NOT NULL UNIQUE
                  CHECK (role IN ('KOMISYON_BASKANI', 'UYE_1', 'UYE_2', 'SEKRETER')),
    -- Ekranlarda ve ileride Word çıktısında görünen ad, örn. "Dr. Öğr. Üyesi Ad SOYAD".
    display_name  VARCHAR(200) NOT NULL,
    -- Şifre düz metin olarak DEĞİL, BCrypt hash'i olarak saklanır (60 karakter; pay bırakıldı).
    -- NULL: şifre henüz belirlenmedi ya da sıfırlandı. Bu durumda girişte yazılan değer yeni şifre olur.
    password_hash VARCHAR(100)
);

-- 4 hesap hazır gelir; görünen adlar başta rol adıdır, Ayarlar > Kullanıcılar ekranından değiştirilir.
INSERT INTO app_user (role, display_name) VALUES
    ('KOMISYON_BASKANI', 'Komisyon Başkanı'),
    ('UYE_1', 'Üye 1'),
    ('UYE_2', 'Üye 2'),
    ('SEKRETER', 'Sekreter');
