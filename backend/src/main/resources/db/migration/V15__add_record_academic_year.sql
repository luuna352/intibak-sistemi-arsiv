-- Kaydın eğitim-öğretim yılı (Word formundaki "2026 - 2027 EĞİTİM - öğretim yılı"). Ayarlardaki aktif yıl her yıl
-- değişir; kayıt ise açıldığı yılın formudur. Bu yüzden yıl kayda ayrıca yazılır: aktif yıl sonradan değişse de eski
-- kaydın Word çıktısı kendi yılıyla çıkar. Sadece ilk yıl tutulur (2026 -> "2026-2027").
ALTER TABLE intibak_record ADD COLUMN academic_start_year INT;

-- Bu migration'dan önce açılmış kayıtlar o anki aktif yılı alır (hepsi bu yıl açıldı).
UPDATE intibak_record
SET academic_start_year = (SELECT value::INT FROM setting WHERE key = 'active_start_year');

-- Bundan sonra her kaydın yılı olmalı; aralık ayarlar ekranındakiyle aynı (2000-2100).
ALTER TABLE intibak_record ALTER COLUMN academic_start_year SET NOT NULL;
ALTER TABLE intibak_record ADD CONSTRAINT intibak_record_academic_start_year_check
    CHECK (academic_start_year BETWEEN 2000 AND 2100);
