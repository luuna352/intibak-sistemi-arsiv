package tr.edu.yalova.intibak.record;

/** İntibak kaydına yüklenen belgenin türü (V13 intibak_document.kind). */
public enum DocumentKind {
    TRANSCRIPT("Transkript"),
    CONTENT("Ders içerik belgesi");

    private final String label;

    DocumentKind(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
