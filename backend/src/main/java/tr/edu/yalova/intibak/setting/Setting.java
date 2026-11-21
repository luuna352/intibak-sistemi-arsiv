package tr.edu.yalova.intibak.setting;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** setting tablosunun bir satırı (V2__create_setting.sql). */
@Entity
@Table(name = "setting")
public class Setting {

    @Id
    @Column(length = 50)
    private String key;

    @Column(nullable = false, length = 500)
    private String value;

    @Column(name = "updated_by_name", length = 200)
    private String updatedByName;

    // Instant: zaman dilimi bağımsız an; veritabanında TIMESTAMPTZ.
    @Column(name = "updated_at")
    private Instant updatedAt;

    protected Setting() {
    }

    public String getKey() {
        return key;
    }

    public String getValue() {
        return value;
    }

    public String getUpdatedByName() {
        return updatedByName;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    /** Değeri değiştirir ve kimin, ne zaman değiştirdiğini (ad metni olarak) yazar. */
    public void change(String value, String updatedByName, Instant updatedAt) {
        this.value = value;
        this.updatedByName = updatedByName;
        this.updatedAt = updatedAt;
    }
}
