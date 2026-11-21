package tr.edu.yalova.intibak.user;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** app_user tablosuna erişim. Metotların SQL'ini Spring Data, metot adından ya da @Query'den üretir. */
public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByRole(Role role);

    // Ekranda roller hep aynı sırada (migration'daki ekleme sırası) görünsün.
    List<AppUser> findAllByOrderByIdAsc();

    /**
     * İlk şifreyi sadece şifre hâlâ boşsa yazar ve değişen satır sayısını döner (1 ya da 0).
     * Koşul WHERE içinde olduğu için aynı anda iki kişi aynı boş hesaba giriş yapmaya çalışırsa sadece biri
     * şifreyi belirler; diğerine 0 döner ve onun şifresi normal kontrol edilir.
     * clearAutomatically: bu UPDATE JPA'nın bellekteki nesnelerini atlayarak doğrudan veritabanına gider;
     * sonrasında bellekteki eski kopyalar temizlenir ki tekrar okununca güncel değer gelsin.
     */
    @Modifying(clearAutomatically = true)
    @Query("update AppUser u set u.passwordHash = :hash where u.role = :role and u.passwordHash is null")
    int setPasswordIfEmpty(@Param("role") Role role, @Param("hash") String hash);
}
