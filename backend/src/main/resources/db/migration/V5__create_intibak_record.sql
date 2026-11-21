-- İntibak kayıtları (docs/devir-notu.md: liste, soft delete, durumlar, audit alanları). Şimdilik öğrenci bilgileri
-- elle girilir; ders eşleştirme, sınıf hesabı ve Word çıktısı sonraki adımlarda bu kayda bağlanacak.
CREATE TABLE intibak_record (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- TC Kimlik No: 11 hane (yabancı uyruklu öğrencinin 99 ile başlayan numarası da 11 hanedir).
    tc_no              VARCHAR(11)  NOT NULL CHECK (tc_no ~ '^[0-9]{11}$'),
    full_name          VARCHAR(200) NOT NULL,
    transfer_type      VARCHAR(10)  NOT NULL CHECK (transfer_type IN ('YATAY', 'DGS', 'AF', 'YOS', 'OSYS')),
    university         VARCHAR(200),
    faculty_department VARCHAR(300),
    registration_date  DATE,
    -- 4 durum: Oluşturuluyor, Değiştiriliyor, İptal, Word'e aktarıldı.
    status             VARCHAR(20)  NOT NULL
        CHECK (status IN ('OLUSTURULUYOR', 'DEGISTIRILIYOR', 'IPTAL', 'WORDE_AKTARILDI')),
    -- Kayıt fiziksel olarak silinmez. "İptal et" durumu IPTAL yapar ve önceki durumu buraya yazar;
    -- "İptali geri al" kaydı bu duruma döndürür.
    status_before_cancel VARCHAR(20)
        CHECK (status_before_cancel IN ('OLUSTURULUYOR', 'DEGISTIRILIYOR', 'WORDE_AKTARILDI')),
    -- "Fatura mantığı": işlemi yapanın o anki görünen adı metin olarak kopyalanır; rolün adı sonradan
    -- değişse de eski kayıtlar değişmez.
    created_by_name    VARCHAR(200) NOT NULL,
    created_at         TIMESTAMPTZ  NOT NULL,
    updated_by_name    VARCHAR(200),
    updated_at         TIMESTAMPTZ
);

-- Liste varsayılan olarak iptal edilmemiş kayıtları gösterir (status <> 'IPTAL' sorgusu bu indeksi kullanır).
CREATE INDEX idx_intibak_record_status ON intibak_record (status);
