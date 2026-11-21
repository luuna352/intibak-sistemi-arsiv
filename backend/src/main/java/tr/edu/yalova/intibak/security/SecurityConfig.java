package tr.edu.yalova.intibak.security;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfTokenRepository;

/**
 * Spring Security ayarları: session ile giriş (giriş bilgisi sunucuda, tarayıcıda sadece JSESSIONID cookie'si),
 * CSRF koruması ve hangi adresin giriş gerektirdiği.
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, CsrfTokenRepository csrfTokenRepository,
            SecurityContextRepository securityContextRepository) {
        http
                .authorizeHttpRequests(auth -> auth
                        // Giriş öncesi çağrılanlar: rol listesi, CSRF token'ı, giriş, sağlık kontrolü.
                        .requestMatchers("/api/auth/roles", "/api/auth/csrf", "/api/auth/login", "/api/health")
                        .permitAll()
                        // Diğer tüm API adresleri giriş ister. 4 rol eşit yetkili olduğu için rol ayrımı yok.
                        .requestMatchers("/api/**").authenticated()
                        // /api dışı (React'in dosyaları) herkese açık; veri zaten /api'den gelir.
                        .anyRequest().permitAll())
                // CSRF: token XSRF-TOKEN cookie'sinde. HttpOnly değil, çünkü React okuyup X-XSRF-TOKEN header'ına
                // koyar. Başka bir site bu cookie'yi okuyamaz, header'ı da koyamaz; eşleşmeyen POST/PUT 403 alır.
                // spa(): React'in gönderdiği ham token'ı kabul eden SPA ayarı.
                .csrf(csrf -> csrf.spa().csrfTokenRepository(csrfTokenRepository))
                .securityContext(context -> context.securityContextRepository(securityContextRepository))
                // Giriş yapılmadan gelen API isteği: login sayfasına yönlendirme değil, düz 401 cevabı.
                .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                // Çıkış: Spring Security session'ı kapatır, cookie'leri siler, 204 döner.
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .deleteCookies("JSESSIONID")
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)));
        // formLogin / httpBasic yok: giriş JSON ile AuthController'dan yapılır.
        return http.build();
    }

    // BCrypt: her hash farklı rastgele "salt" ile üretilir ve bilerek yavaştır (tahmin denemelerini zorlaştırır).
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // CSRF filtresi ve giriş (AuthController) aynı nesneyi kullanmalı: girişte token yenilenince ikisi de görsün.
    @Bean
    CsrfTokenRepository csrfTokenRepository() {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        // Lax: cookie başka sitelerden gelen POST isteklerine eklenmez.
        repository.setCookieCustomizer(cookie -> cookie.sameSite("Lax"));
        return repository;
    }

    // Giriş yapan kullanıcının bilgisi (SecurityContext) HTTP session'ında saklanır; sonraki istekler oradan okunur.
    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    /**
     * Başarılı girişten hemen sonra:
     * 1. Session id değiştirilir (session fixation): girişten önce ele geçirilmiş bir session id girişten sonra işe yaramaz.
     * 2. CSRF token'ı yenilenir (aynı sebeple).
     */
    @Bean
    SessionAuthenticationStrategy sessionAuthenticationStrategy(CsrfTokenRepository csrfTokenRepository) {
        return new CompositeSessionAuthenticationStrategy(List.of(
                new ChangeSessionIdAuthenticationStrategy(),
                new CsrfAuthenticationStrategy(csrfTokenRepository)));
    }
}
