package tr.edu.yalova.intibak.user;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Ayarlar > Kullanıcılar ekranının endpoint'leri. Hepsi giriş gerektirir (SecurityConfig: /api/** authenticated).
 * {role} adres parçası enum adıdır (örn. /api/users/UYE_1/reset-password); Spring metni Role'e kendisi çevirir.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /** İstek gövdesi: {"displayName": "Dr. Öğr. Üyesi Ad SOYAD"}. Kurallar tutmazsa ApiExceptionHandler 400 döner. */
    public record DisplayNameRequest(
            @NotBlank(message = "Görünen ad boş olamaz.")
            @Size(max = 200, message = "Görünen ad en fazla 200 karakter olabilir.")
            String displayName) {
    }

    @GetMapping
    public List<UserResponse> list() {
        return userService.list();
    }

    @PutMapping("/{role}/display-name")
    public UserResponse updateDisplayName(@PathVariable Role role, @Valid @RequestBody DisplayNameRequest body) {
        return userService.updateDisplayName(role, body.displayName());
    }

    /** 204 No Content: işlem başarılı, cevapta gövde yok. */
    @PostMapping("/{role}/reset-password")
    public ResponseEntity<Void> resetPassword(@PathVariable Role role) {
        userService.resetPassword(role);
        return ResponseEntity.noContent().build();
    }
}
