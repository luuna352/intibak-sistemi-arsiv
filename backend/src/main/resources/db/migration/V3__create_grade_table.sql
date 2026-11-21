-- Not dönüşüm tabloları (PT = Puan Tablosu; docs/devir-notu.md 1.3). Her üniversite farklı not sistemi kullanır
-- (100'lük puan, AA-FF, A1-F3 ...); öğrencinin notu, geldiği sistemin tablosuyla Yalova harf notuna çevrilir.
-- Not eşleştirme kişisel takdirle yapılamaz (hukuki sorumluluk): değerler mevzuattan (Senato Esasları EK-1) gelir.
CREATE TABLE grade_table (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Kısa kod: PT1, PT2 ... Yeni tablo eklenince sıradaki numara verilir.
    code            VARCHAR(10)  NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    -- Kaynak ve açıklama (örn. hangi mevzuat maddesinden alındığı).
    description     VARCHAR(500),
    -- "Fatura mantığı": işlemi yapanın o anki görünen adı metin olarak kopyalanır.
    created_by_name VARCHAR(200) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_by_name VARCHAR(200),
    updated_at      TIMESTAMPTZ
);

-- Tablonun satırları (hocanın istediği 4 sütun): karşı üniversite harf notu, karşı üniversite puan aralığı,
-- Yalova harf notu, Yalova puanı. Yalova puanı SAKLANMAZ: Yalova harfinden hesaplanır (AA = 4.00 ...), böylece harf
-- ile puan hiçbir zaman çelişemez (Java'daki YalovaGrade enum'u).
CREATE TABLE grade_table_row (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Tablo silinirse satırları da silinir (ON DELETE CASCADE).
    grade_table_id BIGINT       NOT NULL REFERENCES grade_table (id) ON DELETE CASCADE,
    -- Ekrandaki sıra (0, 1, 2 ...).
    position       INT          NOT NULL,
    -- Harf sistemlerinde dolu (AA, B1 ...). 100'lük sistemde boş olabilir.
    source_letter  VARCHAR(10),
    -- Puan aralığı (100'lük). Harf sistemlerinde boş olabilir.
    source_min     NUMERIC(5, 2),
    source_max     NUMERIC(5, 2),
    target_letter  VARCHAR(2)   NOT NULL
                   CHECK (target_letter IN ('AA', 'BA', 'BB', 'CB', 'CC', 'DC', 'DD', 'FD', 'FF', 'DZ')),
    -- Satırın anahtarı: ya harf ya da (ikisi birlikte) aralık olmalı; aralık 0-100 içinde ve alt <= üst.
    CONSTRAINT ck_grade_row_key CHECK (source_letter IS NOT NULL OR (source_min IS NOT NULL AND source_max IS NOT NULL)),
    CONSTRAINT ck_grade_row_range CHECK ((source_min IS NULL) = (source_max IS NULL)
        AND (source_min IS NULL OR (source_min >= 0 AND source_max <= 100 AND source_min <= source_max)))
);

CREATE INDEX idx_grade_table_row_table ON grade_table_row (grade_table_id);

-- Hazır tablolar. Değerler Yalova Üniversitesi Senato Esasları (2023) EK-1'den, eski intibak projesinin
-- aktarımından alındı; komisyon tarafından orijinal belgeyle karşılaştırılıp doğrulanmalı.
INSERT INTO grade_table (code, name, description, created_by_name, created_at) VALUES
    ('PT1', '100''lük puan sistemi', 'Senato Esasları 2023 EK-1, 100''lük sistem (Yalova DDS tablosuyla aynı). Doğrulanacak.', 'Sistem (hazır tablo)', now()),
    ('PT2', 'Harf notu sistemi (AA-FF)', 'Senato Esasları 2023 EK-1, AA-FF sistemi (karşı katsayılar 4.00, 3.70, 3.30 ...). Doğrulanacak.', 'Sistem (hazır tablo)', now()),
    ('PT3', 'A1-F3 sistemi', 'Senato Esasları 2023 EK-1, A1 ... F3 sistemi. Doğrulanacak.', 'Sistem (hazır tablo)', now());

-- PT1: 100'lük puan aralıkları
INSERT INTO grade_table_row (grade_table_id, position, source_min, source_max, target_letter)
SELECT id, v.position, v.min, v.max, v.letter FROM grade_table,
    (VALUES (0, 90, 100, 'AA'), (1, 85, 89, 'BA'), (2, 80, 84, 'BB'), (3, 75, 79, 'CB'), (4, 65, 74, 'CC'),
            (5, 58, 64, 'DC'), (6, 50, 57, 'DD'), (7, 40, 49, 'FD'), (8, 0, 39, 'FF')) AS v(position, min, max, letter)
WHERE code = 'PT1';

-- PT2: AA-FF harfleri (karşı üniversitede ara harfler farklı katsayılı: AB 3.70, BC 2.70, CD 1.70)
INSERT INTO grade_table_row (grade_table_id, position, source_letter, target_letter)
SELECT id, v.position, v.source, v.letter FROM grade_table,
    (VALUES (0, 'AA', 'AA'), (1, 'AB', 'AA'), (2, 'BA', 'BA'), (3, 'BB', 'BB'), (4, 'BC', 'BB'), (5, 'CB', 'CB'),
            (6, 'CC', 'CC'), (7, 'CD', 'CC'), (8, 'DC', 'DC'), (9, 'DD', 'DD'), (10, 'FF', 'FF')) AS v(position, source, letter)
WHERE code = 'PT2';

-- PT3: A1-F3
INSERT INTO grade_table_row (grade_table_id, position, source_letter, target_letter)
SELECT id, v.position, v.source, v.letter FROM grade_table,
    (VALUES (0, 'A1', 'AA'), (1, 'A2', 'BA'), (2, 'B1', 'BB'), (3, 'B2', 'CB'), (4, 'C1', 'CC'), (5, 'C2', 'DC'),
            (6, 'D1', 'DD'), (7, 'D2', 'FD'), (8, 'F1', 'FF'), (9, 'F2', 'FF'), (10, 'F3', 'FF')) AS v(position, source, letter)
WHERE code = 'PT3';
