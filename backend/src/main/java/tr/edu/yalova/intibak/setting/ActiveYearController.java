package tr.edu.yalova.intibak.setting;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import tr.edu.yalova.intibak.user.Role;
import tr.edu.yalova.intibak.user.UserService;

/** Ayarlar > Aktif eğitim yılı. Giriş gerektirir (SecurityConfig: /api/** authenticated). */
@RestController
@RequestMapping("/api/settings/active-year")
public class ActiveYearController {

    private final ActiveYearService activeYearService;
    private final UserService userService;

    public ActiveYearController(ActiveYearService activeYearService, UserService userService) {
        this.activeYearService = activeYearService;
        this.userService = userService;
    }

    /** İstek gövdesi: {"startYear": 2026}. */
    public record ActiveYearRequest(@NotNull(message = "Yıl girilmelidir.") Integer startYear) {
    }

    @GetMapping
    public ActiveYearService.ActiveYear get() {
        return activeYearService.get();
    }

    @PutMapping
    public ActiveYearService.ActiveYear set(@Valid @RequestBody ActiveYearRequest body, Authentication authentication) {
        // Giriş yapan rolün o anki görünen adı (örn. "Dr. Öğr. Üyesi Ad SOYAD") kayda metin olarak yazılır.
        String changedBy = userService.get(Role.valueOf(authentication.getName())).displayName();
        return activeYearService.set(body.startYear(), changedBy);
    }
}
