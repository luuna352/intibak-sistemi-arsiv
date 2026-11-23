-- Yerleşim (sınıf/dönem) komisyon kararı (docs/eslestirme-kurallari.md kural 7 ve 8): sistem sayılan krediye göre
-- sınıf/dönem önerir; komisyon farklı karar verirse buraya yazılır. İkisi de boşsa sistemin önerisi geçerlidir.
ALTER TABLE intibak_record ADD COLUMN placement_class_level INT CHECK (placement_class_level BETWEEN 1 AND 4);
ALTER TABLE intibak_record ADD COLUMN placement_semester INT CHECK (placement_semester BETWEEN 1 AND 8);

-- İkisi birlikte girilir ve dönem o sınıfın dönemlerinden biri olur (2. sınıf: 3 ya da 4. dönem).
ALTER TABLE intibak_record ADD CONSTRAINT chk_intibak_record_placement CHECK (
    (placement_class_level IS NULL AND placement_semester IS NULL)
    OR (placement_class_level IS NOT NULL AND placement_semester IS NOT NULL
        AND placement_semester IN (placement_class_level * 2 - 1, placement_class_level * 2))
);
