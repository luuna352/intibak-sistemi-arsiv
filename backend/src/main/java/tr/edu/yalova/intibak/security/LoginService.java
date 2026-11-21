package tr.edu.yalova.intibak.security;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tr.edu.yalova.intibak.common.BadRequestException;
import tr.edu.yalova.intibak.common.LoginFailedException;
import tr.edu.yalova.intibak.user.AppUser;
import tr.edu.yalova.intibak.user.AppUserRepository;
import tr.edu.yalova.intibak.user.Role;

/**
 * Giriş kuralı (docs/devir-notu.md 1.1):
 * - Hesabın şifresi varsa: yazılan şifre BCrypt ile kontrol edilir.
 * - Hesabın şifresi yoksa (ilk kurulum ya da "Şifreyi sıfırla" sonrası): yazılan değer hesabın yeni şifresi olur.
 */
@Service
public class LoginService {

    static final int MIN_PASSWORD_LENGTH = 8;

    private final AppUserRepository repository;
    private final PasswordEncoder passwordEncoder;

    public LoginService(AppUserRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    /** Girişin sonucu: hesap ve bu girişte yeni şifre belirlenip belirlenmediği (ekranda bilgi mesajı için). */
    public record LoginResult(AppUser user, boolean passwordCreated) {
    }

    @Transactional
    public LoginResult login(Role role, String password) {
        if (role == null || password == null || password.isEmpty()) {
            throw new BadRequestException("Kullanıcı ve parola girilmelidir.");
        }
        AppUser user = repository.findByRole(role).orElseThrow(LoginFailedException::new);

        if (!user.hasPassword()) {
            if (password.length() < MIN_PASSWORD_LENGTH) {
                throw new BadRequestException(
                        "Bu hesabın şifresi sıfırlanmış. Yeni şifre en az " + MIN_PASSWORD_LENGTH + " karakter olmalı.");
            }
            // Şifre sadece hâlâ boşsa yazılır (aynı anda gelen iki girişten sadece biri belirler).
            if (repository.setPasswordIfEmpty(role, passwordEncoder.encode(password)) == 1) {
                return new LoginResult(repository.findByRole(role).orElseThrow(), true);
            }
            // Arada başka biri şifreyi belirlemiş: güncel satır okunur ve normal kontrol yapılır.
            user = repository.findByRole(role).orElseThrow(LoginFailedException::new);
        }

        // matches(): yazılan şifreyi hash'teki salt ile tekrar hash'ler ve karşılaştırır; hash geri çözülmez.
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new LoginFailedException();
        }
        return new LoginResult(user, false);
    }
}
