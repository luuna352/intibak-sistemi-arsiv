-- Ders planları (öğretim planı; docs/devir-notu.md 1.2). Her akademik yılın planı Excel ile yüklenir, ekranda
-- düzenlenir. Bir yıla tek plan düşer; yılın planı yoksa en yakın eski plan kullanılır (servis katmanında).
CREATE TABLE curriculum_plan (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Planın ilk yılı: 2025 -> "2025-2026" planı. Ekrandaki "2025-2026" metni bundan üretilir.
    start_year       INT          NOT NULL UNIQUE CHECK (start_year BETWEEN 2000 AND 2100),
    -- Son yüklenen Excel dosyasının adı (sadece bilgi; dosyanın kendisi saklanmaz).
    source_file_name VARCHAR(255),
    -- "Fatura mantığı": işlemi yapanın o anki görünen adı metin olarak kopyalanır.
    created_by_name  VARCHAR(200) NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL,
    updated_by_name  VARCHAR(200),
    updated_at       TIMESTAMPTZ
);

-- Planın dersleri. İki tür satır var:
--   1) Yarıyıl dersi: semester 1-8 dolu (1. sınıf = 1-2. yarıyıl ...). "BSM4XX Teknik Seçmeli Ders 4" gibi seçmeli
--      yer tutucular da yarıyıl dersidir, çünkü o yarıyılın kredi/AKTS toplamına girer.
--   2) Seçmeli havuzu dersi: semester boş, group_name dolu ("5-6. yarıyıl teknik seçmeli" ...).
-- group_name yarıyıl derslerinde de kullanılabilir: 4. sınıfın "İME'ye gidenler / gitmeyenler" gibi iki farklı
-- programı olduğunda hangi programa ait olduğunu gösterir.
CREATE TABLE plan_course (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Plan silinirse dersleri de silinir.
    plan_id        BIGINT        NOT NULL REFERENCES curriculum_plan (id) ON DELETE CASCADE,
    -- Excel/ekrandaki sıra.
    position       INT           NOT NULL,
    semester       INT           CHECK (semester BETWEEN 1 AND 8),
    group_name     VARCHAR(100),
    -- Bazı seçmeli derslerin kodu yok (PDF notu: havuz derslerinde "Dersin Kodu" boş olabilir).
    code           VARCHAR(20),
    name           VARCHAR(200)  NOT NULL,
    -- Z/S: zorunlu mu, seçmeli mi.
    compulsory     BOOLEAN       NOT NULL,
    -- Eğitim dili: İngilizce bölüm dersi Türkçe dersle sayılmaz (ileride eşleştirmede kullanılacak).
    language       VARCHAR(2)    NOT NULL CHECK (language IN ('TR', 'EN')),
    -- Saatler ve krediler ondalıklı olabilir (örn. kredi 3.5 = teorik 3 + uygulama 1 / 2).
    theory_hours   NUMERIC(4, 1) CHECK (theory_hours >= 0),
    practice_hours NUMERIC(4, 1) CHECK (practice_hours >= 0),
    credit         NUMERIC(4, 1) NOT NULL CHECK (credit >= 0),
    ects           NUMERIC(4, 1) NOT NULL CHECK (ects >= 0),
    -- Her satır ya bir yarıyıla ya da bir seçmeli havuzuna aittir.
    CONSTRAINT plan_course_place_check CHECK (semester IS NOT NULL OR group_name IS NOT NULL)
);

CREATE INDEX idx_plan_course_plan ON plan_course (plan_id);
