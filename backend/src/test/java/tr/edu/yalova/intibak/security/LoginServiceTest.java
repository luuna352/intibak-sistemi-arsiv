package tr.edu.yalova.intibak.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Constructor;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import tr.edu.yalova.intibak.common.BadRequestException;
import tr.edu.yalova.intibak.common.LoginFailedException;
import tr.edu.yalova.intibak.user.AppUser;
import tr.edu.yalova.intibak.user.AppUserRepository;
import tr.edu.yalova.intibak.user.Role;

/**
 * LoginService'in giriş kuralı. Veritabanı yerine sahte (mock) repository kullanılır; BCrypt gerçektir.
 */
class LoginServiceTest {

    private AppUserRepository repository;
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private LoginService service;

    @BeforeEach
    void setUp() {
        repository = mock(AppUserRepository.class);
        service = new LoginService(repository, encoder);
    }

    @Test
    void correctPasswordLogsIn() {
        AppUser user = user(Role.UYE_1, encoder.encode("dogru-sifre"));
        when(repository.findByRole(Role.UYE_1)).thenReturn(Optional.of(user));

        LoginService.LoginResult result = service.login(Role.UYE_1, "dogru-sifre");

        assertThat(result.user()).isSameAs(user);
        assertThat(result.passwordCreated()).isFalse();
    }

    @Test
    void wrongPasswordIsRejected() {
        when(repository.findByRole(Role.UYE_1)).thenReturn(Optional.of(user(Role.UYE_1, encoder.encode("dogru-sifre"))));

        assertThatThrownBy(() -> service.login(Role.UYE_1, "yanlis-sifre")).isInstanceOf(LoginFailedException.class);
    }

    @Test
    void emptyPasswordAccountTakesTypedPasswordAsNewPassword() {
        AppUser empty = user(Role.SEKRETER, null);
        when(repository.findByRole(Role.SEKRETER)).thenReturn(Optional.of(empty));
        when(repository.setPasswordIfEmpty(eq(Role.SEKRETER), anyString())).thenReturn(1);

        LoginService.LoginResult result = service.login(Role.SEKRETER, "yeni-sifre-123");

        assertThat(result.passwordCreated()).isTrue();
        // Veritabanına düz şifre değil, BCrypt hash'i yazılır ve hash yazılan şifreyle eşleşir.
        verify(repository).setPasswordIfEmpty(eq(Role.SEKRETER),
                org.mockito.ArgumentMatchers.argThat(hash -> !hash.equals("yeni-sifre-123")
                        && encoder.matches("yeni-sifre-123", hash)));
    }

    @Test
    void shortNewPasswordIsRejected() {
        when(repository.findByRole(Role.SEKRETER)).thenReturn(Optional.of(user(Role.SEKRETER, null)));

        assertThatThrownBy(() -> service.login(Role.SEKRETER, "kisa"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("en az 8");
        verify(repository, never()).setPasswordIfEmpty(any(), anyString());
    }

    @Test
    void ifSomeoneElseSetThePasswordFirstTheTypedPasswordIsChecked() {
        // İlk okumada şifre boş, ama UPDATE 0 satır değiştirir (başka bir giriş önce davrandı).
        when(repository.findByRole(Role.UYE_2)).thenReturn(
                Optional.of(user(Role.UYE_2, null)),
                Optional.of(user(Role.UYE_2, encoder.encode("digerinin-sifresi"))));
        when(repository.setPasswordIfEmpty(eq(Role.UYE_2), anyString())).thenReturn(0);

        assertThatThrownBy(() -> service.login(Role.UYE_2, "benim-sifrem-123")).isInstanceOf(LoginFailedException.class);
    }

    @Test
    void missingPasswordIsRejected() {
        assertThatThrownBy(() -> service.login(Role.UYE_1, "")).isInstanceOf(BadRequestException.class);
    }

    // AppUser'ın constructor'ı protected (satırları JPA üretir); testte nesneyi reflection ile kuruyoruz.
    private static AppUser user(Role role, String passwordHash) {
        try {
            Constructor<AppUser> constructor = AppUser.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            AppUser user = constructor.newInstance();
            var roleField = AppUser.class.getDeclaredField("role");
            roleField.setAccessible(true);
            roleField.set(user, role);
            user.setDisplayName(role.label());
            user.setPasswordHash(passwordHash);
            return user;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
