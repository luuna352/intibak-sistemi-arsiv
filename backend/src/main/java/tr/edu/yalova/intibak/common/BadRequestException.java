package tr.edu.yalova.intibak.common;

/** Kullanıcının düzeltebileceği hatalı istek (400). Mesaj Türkçedir ve ekranda olduğu gibi gösterilir. */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
