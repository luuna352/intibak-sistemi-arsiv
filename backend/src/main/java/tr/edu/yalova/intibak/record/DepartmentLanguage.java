package tr.edu.yalova.intibak.record;

/** Öğrencinin geldiği bölümün eğitim dili (transkriptte "Eğitim Dili" diye yazar). Kural 2b'de kullanılır. */
public enum DepartmentLanguage {
    TR("Türkçe"),
    EN30("%30 İngilizce"),
    EN100("%100 İngilizce"),
    UNKNOWN("Bilinmiyor");

    private final String label;

    DepartmentLanguage(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    /** En az %30 İngilizce mi? (Öyleyse hazırlık şartının yerine geçer.) */
    public boolean isEnglish() {
        return this == EN30 || this == EN100;
    }
}
