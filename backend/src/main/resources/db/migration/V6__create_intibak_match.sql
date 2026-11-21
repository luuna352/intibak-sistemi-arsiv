-- İntibak formunun ders eşleştirme tablosu (docs/devir-notu.md "İntibak kaydı"; 23 Kasım onay listesi bölüm 3).
-- Bir eşleştirme satırı: solda karşı kurumun bir ya da birkaç dersi, sağda Yalova'nın bir ya da birkaç dersi
-- (bire-çok / çoğa-bir). Sayılan satırların Yalova kredisi toplanır, sınıf/dönem bu toplamdan hesaplanır.

-- Kaydın hangi not dönüşüm tablosu (PT) ve hangi Yalova ders planıyla değerlendirildiği. Plan silinirse bağlantı
-- boşalır (dersler aşağıda metin olarak kopyalandığı için kayıt bozulmaz).
ALTER TABLE intibak_record ADD COLUMN grade_table_id BIGINT REFERENCES grade_table (id);
ALTER TABLE intibak_record ADD COLUMN plan_id BIGINT REFERENCES curriculum_plan (id) ON DELETE SET NULL;

CREATE TABLE intibak_match (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    record_id BIGINT  NOT NULL REFERENCES intibak_record (id) ON DELETE CASCADE,
    position  INT     NOT NULL,
    -- "Sayıldı mı?": işaretli satırlar muaf sayılır ve kredisi sınıf hesabına girer.
    counted   BOOLEAN NOT NULL
);

-- Eşleştirme satırındaki dersler. side = INCOMING (karşı kurum) ya da YALOVA. Yalova dersi plandaki satıra id ile
-- bağlanmaz, o anki bilgileri METİN olarak kopyalanır: plan sonradan düzenlense de eski kayıt değişmez
-- (fatura mantığı).
CREATE TABLE intibak_match_course (
    id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id BIGINT        NOT NULL REFERENCES intibak_match (id) ON DELETE CASCADE,
    position INT           NOT NULL,
    side     VARCHAR(10)   NOT NULL CHECK (side IN ('INCOMING', 'YALOVA')),
    code     VARCHAR(20),
    name     VARCHAR(200)  NOT NULL,
    credit   NUMERIC(4, 1) CHECK (credit >= 0),
    ects     NUMERIC(4, 1) CHECK (ects >= 0),
    -- Dersin dili: İngilizce Yalova dersi Türkçe dersle sayılmaz.
    language VARCHAR(2)    NOT NULL CHECK (language IN ('TR', 'EN')),
    -- Sadece karşı kurum dersinde: transkriptteki not ("BB", "85", "A1" ...).
    grade    VARCHAR(10)
);

CREATE INDEX idx_intibak_match_record ON intibak_match (record_id);
CREATE INDEX idx_intibak_match_course_match ON intibak_match_course (match_id);
