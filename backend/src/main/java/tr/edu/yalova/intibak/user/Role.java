package tr.edu.yalova.intibak.user;

/**
 * Sistemdeki 4 sabit rol. Veritabanında enum adı (KOMISYON_BASKANI ...) metin olarak saklanır;
 * label giriş ekranındaki açılır listede görünen sabit addır.
 */
public enum Role {
    KOMISYON_BASKANI("Komisyon Başkanı"),
    UYE_1("Üye 1"),
    UYE_2("Üye 2"),
    SEKRETER("Sekreter / Admin");

    private final String label;

    Role(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
