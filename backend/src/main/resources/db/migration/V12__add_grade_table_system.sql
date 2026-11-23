-- Not tablosunun türü (karşı üniversitenin not sistemi). Senato İntibak Esasları EK-1'deki üç tablonun sütunları
-- farklıdır; ekran her tabloyu EK-1'deki gibi sadece kendi sütunlarıyla gösterir:
--   SCORE         = 100'lük puan: tek sütun "100'lü not" (90-100 gibi aralık ya da DEVAMSIZ gibi özel not)  -> PT1
--   LETTER_NUMBER = harf ve sayı: harf notu ve 4'lük karşılığı (A 4.00, A- 3.70 ...)                    -> PT2
--   LETTER        = sadece harf: A1 ... F3                                                                -> PT3
-- Notun Yalova'ya çevrilmesi (MatchCalculator) bu sütuna bakmaz, satırlardaki harf ve aralıkları kullanır.
ALTER TABLE grade_table ADD COLUMN grade_system VARCHAR(20);

UPDATE grade_table SET grade_system = 'SCORE' WHERE code = 'PT1';
UPDATE grade_table SET grade_system = 'LETTER_NUMBER' WHERE code = 'PT2';
UPDATE grade_table SET grade_system = 'LETTER' WHERE code = 'PT3';

-- Sonradan eklenmiş tablolar (PT4 ...) varsa türleri satırlarından bulunur: hiç sayı yoksa sadece harf, harf ile
-- sayı aynı satırda varsa harf ve sayı, yoksa 100'lük puan.
UPDATE grade_table t SET grade_system = CASE
    WHEN NOT EXISTS (SELECT 1 FROM grade_table_row r WHERE r.grade_table_id = t.id AND r.source_min IS NOT NULL)
        THEN 'LETTER'
    WHEN EXISTS (SELECT 1 FROM grade_table_row r
                 WHERE r.grade_table_id = t.id AND r.source_min IS NOT NULL AND r.source_letter IS NOT NULL)
        THEN 'LETTER_NUMBER'
    ELSE 'SCORE' END
WHERE grade_system IS NULL;

ALTER TABLE grade_table ALTER COLUMN grade_system SET NOT NULL;
ALTER TABLE grade_table ADD CONSTRAINT chk_grade_table_system
    CHECK (grade_system IN ('SCORE', 'LETTER_NUMBER', 'LETTER'));
