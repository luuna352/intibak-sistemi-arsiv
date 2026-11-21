package tr.edu.yalova.intibak.record;

/** İntibak kaydının 4 durumu ve ekranda görünen adları. */
public enum RecordStatus {
    OLUSTURULUYOR("Oluşturuluyor"),
    DEGISTIRILIYOR("Değiştiriliyor"),
    IPTAL("İptal"),
    WORDE_AKTARILDI("Word'e aktarıldı");

    private final String label;

    RecordStatus(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
