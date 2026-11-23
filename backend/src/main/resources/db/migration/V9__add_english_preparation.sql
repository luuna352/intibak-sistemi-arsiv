-- Kural 2b (docs/eslestirme-kurallari.md): karşı kurumdaki İngilizce dersin sayılması önerilebilmesi için öğrenci
-- İngilizce hazırlığı geçmiş (ya da sınavla muaf) olmalı veya geldiği bölüm en az %30 İngilizce olmalı. Bilgi
-- girilmemişse UNKNOWN: sistem "sayılmaz" önerir ve bilgiyi ister (komisyon yine de sayabilir, kural 8).
ALTER TABLE intibak_record ADD COLUMN prep_status VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN'
    CHECK (prep_status IN ('PASSED', 'NOT_TAKEN', 'UNKNOWN'));
ALTER TABLE intibak_record ADD COLUMN department_language VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN'
    CHECK (department_language IN ('TR', 'EN30', 'EN100', 'UNKNOWN'));
