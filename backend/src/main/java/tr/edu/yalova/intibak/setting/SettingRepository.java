package tr.edu.yalova.intibak.setting;

import org.springframework.data.jpa.repository.JpaRepository;

/** setting tablosuna erişim; anahtar (key) primary key olduğu için findById(key) yeterli. */
public interface SettingRepository extends JpaRepository<Setting, String> {
}
