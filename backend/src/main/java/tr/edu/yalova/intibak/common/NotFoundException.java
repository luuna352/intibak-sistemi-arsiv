package tr.edu.yalova.intibak.common;

/** İstenen kayıt yok (404). Mesaj Türkçedir ve ekranda gösterilir. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
