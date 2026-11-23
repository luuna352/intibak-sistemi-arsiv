package tr.edu.yalova.intibak.record;

/**
 * Öğrencinin İngilizce hazırlık durumu (kural 2b): karşı kurumdaki İngilizce dersin sayılabilmesi için hazırlığın
 * geçilmiş (ya da sınavla muaf olunmuş) olması ya da bölümün en az %30 İngilizce olması gerekir.
 */
public enum PrepStatus {
    PASSED("Geçti / sınavla muaf"),
    NOT_TAKEN("Okumadı / geçemedi"),
    UNKNOWN("Bilinmiyor");

    private final String label;

    PrepStatus(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
