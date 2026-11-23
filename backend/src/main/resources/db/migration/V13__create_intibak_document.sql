-- İntibak kaydının belgeleri: öğrencinin transkripti ve ders içerik belgesi (PDF/DOCX). Her kayıtta her türden en
-- fazla bir dosya olur; yenisi yüklenince eskisinin yerine geçer. Dosyalar sadece bu veritabanında durur (KVKK: dış
-- servise gitmez). Bir öğrenci birden çok yatay geçiş yaptıysa her önceki üniversite için ayrı kayıt açılır; her
-- kaydın kendi belgeleri olur (ör. BL notunun gerçek harfi 1. üniversitenin transkriptinden okunur).
CREATE TABLE intibak_document (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    record_id        BIGINT       NOT NULL REFERENCES intibak_record (id),
    -- TRANSCRIPT: transkript, CONTENT: ders içerik belgesi.
    kind             VARCHAR(20)  NOT NULL CHECK (kind IN ('TRANSCRIPT', 'CONTENT')),
    file_name        VARCHAR(255) NOT NULL,
    content_type     VARCHAR(100) NOT NULL,
    size_bytes       BIGINT       NOT NULL CHECK (size_bytes > 0),
    -- Dosyanın kendisi (bayt olarak).
    data             BYTEA        NOT NULL,
    -- "Fiş mantığı": yükleyenin o anki görünen adı metin olarak kopyalanır.
    uploaded_by_name VARCHAR(200) NOT NULL,
    uploaded_at      TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_intibak_document_kind UNIQUE (record_id, kind)
);

-- Öğrencinin ders içerikleri transkriptin içindeyse ayrı içerik belgesi yüklenmez; "Belgede bul" transkriptte arar.
ALTER TABLE intibak_record ADD COLUMN content_in_transcript BOOLEAN NOT NULL DEFAULT FALSE;

-- Aynı öğrencinin diğer kayıtlarını (aynı TC) bulmak için.
CREATE INDEX idx_intibak_record_tc_no ON intibak_record (tc_no);
