-- A2 (docs/eslestirme-kurallari.md, kural 5): Yalova dersinin içeriği, plan dersinde bir kez saklanır. Her satır bir
-- konudur. İntibak formunda bu ders seçilince konular kendiliğinden gelir; kayda kopya olarak geçer (V10), bu yüzden
-- içerik sonradan değişse de eski kayıtların karşılaştırması aynen kalır. Boş = içerik girilmemiş.
ALTER TABLE plan_course ADD COLUMN content TEXT CHECK (char_length(content) <= 20000);
