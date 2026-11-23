-- Hazır not tablolarını Senato İntibak Esasları EK-1 "Not Dönüşüm Tablosu" ile birebir aynı yapar.
-- V3 çalışmış bir migration olduğu için değiştirilmez (Flyway sağlama toplamı tutmaz); düzeltme burada yapılır.
-- EK-1'de yan yana 3 tablo vardır: 100'lük not sistemi (PT1), A / A- / B+ ... harf sistemi (PT2), A1-F3 sistemi
-- (PT3). PT3 zaten EK-1 ile aynıdır, ona dokunulmaz.

-- PT1: EK-1'deki son satır eksikti: DEVAMSIZ -> DZ (0.00). Puan aralığı yoktur, karşı not "DEVAMSIZ" yazısıdır.
INSERT INTO grade_table_row (grade_table_id, position, source_letter, target_letter)
SELECT id, 9, 'DEVAMSIZ', 'DZ' FROM grade_table WHERE code = 'PT1';

UPDATE grade_table
SET name = '100''lük not sistemi',
    description = 'Senato İntibak Esasları EK-1, 100''lük not sistemi (90-100 AA ... 0-39 FF, DEVAMSIZ DZ).'
WHERE code = 'PT1';

-- PT2: V3'te yanlış harflerle (AB, BC, CD) girilmişti. EK-1'deki harf sistemi A, A-, B+, B, B-, C+, C, C-, D+, D,
-- F, F0'dır. Karşı üniversitenin sayısı (4.00, 3.70 ...) "puan aralığı" sütununa alt = üst olarak yazılır; böylece
-- öğrencinin notu sayı olarak gelse de (örn. 3.5) çevrilebilir ve iki sayı arasında kalırsa öğrenci lehine üstteki
-- harf seçilir (MatchCalculator).
DELETE FROM grade_table_row WHERE grade_table_id = (SELECT id FROM grade_table WHERE code = 'PT2');

INSERT INTO grade_table_row (grade_table_id, position, source_letter, source_min, source_max, target_letter)
SELECT id, v.position, v.source, v.score, v.score, v.letter FROM grade_table,
    (VALUES (0, 'A', 4.00, 'AA'), (1, 'A-', 3.70, 'AA'), (2, 'B+', 3.30, 'BA'), (3, 'B', 3.00, 'BB'),
            (4, 'B-', 2.70, 'BB'), (5, 'C+', 2.30, 'CB'), (6, 'C', 2.00, 'CC'), (7, 'C-', 1.70, 'CC'),
            (8, 'D+', 1.30, 'DC'), (9, 'D', 1.00, 'DD'), (10, 'F', 0.00, 'FF')) AS v(position, source, score, letter)
WHERE code = 'PT2';

-- F0 (devamsız): EK-1'de sayı yerine "DEVAMSIZ" yazar, Yalova karşılığı 0.00'dır. EK-1 Yalova harfini "F0" diye
-- yazar; Yalova not sisteminde bu harf yoktur, devamsızlığın Yalova karşılığı DZ (0.00) olduğu için DZ girildi.
-- Komisyona sorulacak.
INSERT INTO grade_table_row (grade_table_id, position, source_letter, target_letter)
SELECT id, 11, 'F0', 'DZ' FROM grade_table WHERE code = 'PT2';

UPDATE grade_table
SET name = 'Harf notu sistemi (A, A-, B+ ... F0)',
    description = 'Senato İntibak Esasları EK-1, harf notu sistemi (A 4.00, A- 3.70, B+ 3.30 ... F 0.00, F0 devamsız).'
WHERE code = 'PT2';

UPDATE grade_table
SET description = 'Senato İntibak Esasları EK-1, A1 ... F3 not sistemi.'
WHERE code = 'PT3';
