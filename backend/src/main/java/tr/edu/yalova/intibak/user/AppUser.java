package tr.edu.yalova.intibak.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** app_user tablosunun bir satırı (V1__create_app_user.sql). Satırlar migration ile gelir, uygulama yeni satır eklemez. */
@Entity
@Table(name = "app_user")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // EnumType.STRING: veritabanına sıra numarası (0, 1 ...) değil, adı ("UYE_1") yazılır.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 30)
    private Role role;

    @Column(name = "display_name", nullable = false, length = 200)
    private String displayName;

    // NULL: şifre belirlenmedi / sıfırlandı (bkz. LoginService).
    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    // JPA, satırı nesneye çevirirken parametresiz constructor kullanır; dışarıdan çağrılmasın diye protected.
    protected AppUser() {
    }

    public Long getId() {
        return id;
    }

    public Role getRole() {
        return role;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public boolean hasPassword() {
        return passwordHash != null;
    }
}
