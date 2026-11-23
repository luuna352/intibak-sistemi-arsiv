-- Kural 5 (docs/eslestirme-kurallari.md): ad farklıysa iki dersin içeriği yan yana karşılaştırılır.

-- Kural 5: eşleştirmedeki bir dersin içeriği, konu konu (bir satır = bir konu). Yalova dersinin konularında
-- covered = "bu konu karşı derste karşılanıyor" (komisyon işaretler). Yüzde = karşılanan / toplam Yalova konusu;
-- sabit eşik yok, kararı komisyon verir. Konular kayda kopya olarak saklanır: içerik belgesi sonradan değişse de eski
-- kaydın karşılaştırması aynen görünür (fatura mantığı).
CREATE TABLE intibak_match_topic (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id BIGINT       NOT NULL REFERENCES intibak_match_course (id) ON DELETE CASCADE,
    position  INT          NOT NULL,
    text      VARCHAR(500) NOT NULL,
    covered   BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_intibak_match_topic_course ON intibak_match_topic (course_id);
