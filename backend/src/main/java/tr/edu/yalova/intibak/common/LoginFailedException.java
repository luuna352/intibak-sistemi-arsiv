package tr.edu.yalova.intibak.common;

/** Giriş başarısız (401). Hangi kısmın yanlış olduğu söylenmez, tek mesaj verilir. */
public class LoginFailedException extends RuntimeException {

    public LoginFailedException() {
        super("Şifre hatalı.");
    }
}
