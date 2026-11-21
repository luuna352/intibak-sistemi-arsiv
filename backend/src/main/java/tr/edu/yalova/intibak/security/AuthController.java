package tr.edu.yalova.intibak.security;

import java.util.Arrays;
import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import tr.edu.yalova.intibak.user.AppUser;
import tr.edu.yalova.intibak.user.Role;
import tr.edu.yalova.intibak.user.UserResponse;
import tr.edu.yalova.intibak.user.UserService;

/**
 * Giriş ekranının endpoint'leri. Çıkış (POST /api/auth/logout) Spring Security'nin kendi filtresinde yapılır
 * (SecurityConfig), buraya gelmez.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final LoginService loginService;
    private final UserService userService;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
    private final SecurityContextRepository securityContextRepository;

    public AuthController(LoginService loginService, UserService userService,
            SessionAuthenticationStrategy sessionAuthenticationStrategy,
            SecurityContextRepository securityContextRepository) {
        this.loginService = loginService;
        this.userService = userService;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
        this.securityContextRepository = securityContextRepository;
    }

    public record RoleOption(Role role, String label) {
    }

    public record LoginRequest(Role role, String password) {
    }

    /** Girişin cevabı: kullanıcı bilgisi + bu girişte yeni şifre belirlendiyse true. */
    public record LoginResponse(UserResponse user, boolean passwordCreated) {
    }

    /** Giriş ekranındaki "Kullanıcı" açılır listesi. Sabit rol adları döner (görünen ad değil, isim gizli kalsın). */
    @GetMapping("/roles")
    public List<RoleOption> roles() {
        return Arrays.stream(Role.values()).map(r -> new RoleOption(r, r.label())).toList();
    }

    /**
     * CSRF token'ını XSRF-TOKEN cookie'si olarak gönderir (gövde yok). Spring token'ı ancak biri okuduğunda
     * üretip cookie'ye yazar; getToken() bunu tetikler. React açılışta bunu bir kez çağırır.
     */
    @GetMapping("/csrf")
    public ResponseEntity<Void> csrf(CsrfToken csrfToken) {
        csrfToken.getToken();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest body, HttpServletRequest request,
            HttpServletResponse response) {
        // Şifre kontrolü / ilk şifrenin belirlenmesi. Hata varsa exception fırlar (400 ya da 401).
        LoginService.LoginResult result = loginService.login(body.role(), body.password());
        AppUser user = result.user();

        // Spring Security'nin "giriş yapmış kullanıcı" nesnesi. name = rol adı (örn. "UYE_1"); şifre tutulmaz (null).
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                user.getRole().name(), null, List.of(new SimpleGrantedAuthority("ROLE_KOMISYON")));

        // Session id değiştirilir ve CSRF token'ı yenilenir (SecurityConfig.sessionAuthenticationStrategy).
        sessionAuthenticationStrategy.onAuthentication(authentication, request, response);
        // Yeni CSRF token'ı hemen cevaba cookie olarak yazılsın diye okunur.
        CsrfToken newToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (newToken != null) {
            newToken.getToken();
        }

        // Kullanıcı session'a kaydedilir; sonraki istekler JSESSIONID cookie'si ile gelir ve buradan tanınır.
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        return new LoginResponse(UserResponse.from(user), result.passwordCreated());
    }

    /** Giriş yapmış kullanıcının güncel bilgisi. Giriş yoksa Spring Security 401 döner. */
    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return userService.get(Role.valueOf(authentication.getName()));
    }
}
