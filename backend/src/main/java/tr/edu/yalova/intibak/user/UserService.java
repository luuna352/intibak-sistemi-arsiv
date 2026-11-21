package tr.edu.yalova.intibak.user;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tr.edu.yalova.intibak.common.BadRequestException;

/** Ayarlar > Kullanıcılar ekranının işleri: listeleme, görünen adı değiştirme, şifre sıfırlama. */
@Service
public class UserService {

    private final AppUserRepository repository;

    public UserService(AppUserRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> list() {
        return repository.findAllByOrderByIdAsc().stream().map(UserResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public UserResponse get(Role role) {
        return UserResponse.from(find(role));
    }

    /**
     * Görünen adı değiştirir. @Transactional: metot bitince JPA, nesnede değişen alanı fark edip UPDATE'i kendisi
     * yazar (ayrıca save() çağırmaya gerek yok).
     */
    @Transactional
    public UserResponse updateDisplayName(Role role, String displayName) {
        String trimmed = displayName == null ? "" : displayName.trim();
        if (trimmed.isEmpty()) {
            throw new BadRequestException("Görünen ad boş olamaz.");
        }
        AppUser user = find(role);
        user.setDisplayName(trimmed);
        return UserResponse.from(user);
    }

    /**
     * Şifreyi sıfırlar: hash silinir (NULL). Kimse eski şifreyi göremez; hesabın sahibi girişte yazdığı yeni değeri
     * şifre olarak belirler (LoginService). 4 rol eşit yetkili olduğu için her giriş yapmış kullanıcı yapabilir.
     */
    @Transactional
    public void resetPassword(Role role) {
        find(role).setPasswordHash(null);
    }

    // 4 satır migration ile geldiği için normalde hep bulunur; bulunamazsa veritabanı eksik kurulmuştur.
    private AppUser find(Role role) {
        return repository.findByRole(role)
                .orElseThrow(() -> new IllegalStateException("app_user tablosunda rol yok: " + role));
    }
}
