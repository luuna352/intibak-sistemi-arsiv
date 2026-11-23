-- Öğrencinin ders listesi: transkriptteki bütün dersler (eşleşen de eşleşmeyen de). Formdaki iki sütunlu ekranın sol
-- tarafı bu listedir; eşleştirme satırındaki karşı dersler bu listeden seçilir. İleride transkript okuma (yapay zekâ)
-- da bu listeyi dolduracak; her durumda komisyon kontrol edip düzeltir.
CREATE TABLE intibak_source_course (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    record_id BIGINT        NOT NULL REFERENCES intibak_record (id) ON DELETE CASCADE,
    -- Listedeki sıra (0'dan). Eşleştirmedeki karşı ders bu numarayla listedeki derse bağlanır.
    position  INT           NOT NULL,
    code      VARCHAR(20),
    name      VARCHAR(200)  NOT NULL,
    -- Dersin ait olduğu yarıyıl (Word'deki "Dersin ait olduğu yarıyıl"). Transkriptte "3" ya da "2023-2024 Güz" gibi
    -- yazılabildiği için metin.
    semester  VARCHAR(20),
    credit    NUMERIC(4, 1) CHECK (credit >= 0),
    ects      NUMERIC(4, 1) CHECK (ects >= 0),
    language  VARCHAR(2)    NOT NULL CHECK (language IN ('TR', 'EN')),
    -- Transkriptteki not ("BB", "85", "A1", "BL" ...).
    grade     VARCHAR(10)
);
-- (record_id, position) için UNIQUE kısıtı bilerek yok: kayıt değişince Hibernate yeni satırları eskileri silmeden önce
-- ekler, aynı sıra numarası bir an iki kez bulunur. Sıra numaralarını RecordService 0'dan sırayla verir.

CREATE INDEX idx_intibak_source_course_record ON intibak_source_course (record_id);

-- Eşleştirmedeki karşı ders: listedeki hangi dersten geldiği (sıra numarası) ve yarıyılı. Ders bilgileri kaydederken
-- listeden buraya kopyalanır (fiş mantığı: Word ve hesap bu satırdan okunur).
ALTER TABLE intibak_match_course ADD COLUMN source_position INT;
ALTER TABLE intibak_match_course ADD COLUMN semester VARCHAR(20);
