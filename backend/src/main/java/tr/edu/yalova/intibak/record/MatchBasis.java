package tr.edu.yalova.intibak.record;

/**
 * Bir eşleştirme satırının hangi kuralla değerlendirildiği (docs/eslestirme-kurallari.md kural 3, 4, 5): Türk Dili /
 * tarih dersi ve aynı ad doğrudan kabul; adlar farklıysa içerik karşılaştırması (kararı komisyon verir).
 */
public enum MatchBasis {
    COMMON_COURSE("Türk Dili / tarih dersi: doğrudan kabul"),
    SAME_NAME("Ders adı aynı: doğrudan kabul"),
    CONTENT("Ders adı farklı: içerik karşılaştırması");

    private final String label;

    MatchBasis(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
