package tr.edu.yalova.intibak.record;

/**
 * Geçiş (kayıt) türü. Liste hocayla netleşecek: mockup'ta Yatay/DGS/Af, Word şablonunda DİKEY/YATAY/YÖS/ÖSS var;
 * ikisinin birleşimi alındı. Yeni tür eklemek için hem buraya hem V*.sql'deki CHECK kısıtına eklenmeli.
 */
public enum TransferType {
    YATAY("Yatay geçiş"),
    DGS("Dikey geçiş (DGS)"),
    AF("Af"),
    YOS("YÖS"),
    OSYS("ÖSYS");

    private final String label;

    TransferType(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
