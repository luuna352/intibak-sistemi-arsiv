package tr.edu.yalova.intibak.setting;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.stream.IntStream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tr.edu.yalova.intibak.common.BadRequestException;

/**
 * Aktif eğitim-öğretim yılı (docs/devir-notu.md 1.4). Tek bir yerde (setting tablosu) tutulur, herkes aynı yılı görür.
 * Kural: aktif yıl 2026-2027 iken 1. sınıf 2026-2027, 2. sınıf 2025-2026, 3. sınıf 2024-2025 ders planını kullanır
 * (öğrencinin sınıf arkadaşlarının girdiği yılın planı).
 */
@Service
public class ActiveYearService {

    static final String KEY = "active_start_year";
    static final int MIN_YEAR = 2000;
    static final int MAX_YEAR = 2100;
    // Sistem en fazla 3. sınıfa yerleştirir (kredi > 60 ya da DGS), ama komisyon yerleşimi 4. sınıf dahil
    // değiştirebilir (kural 8); bu yüzden plan eşlemesi 1-4. sınıf için gösterilir.
    static final int MAX_PLACEMENT_CLASS = 4;

    private final SettingRepository repository;
    // Saat dışarıdan verilir: testlerde sabit bir an kullanılabilsin.
    private final Clock clock;

    public ActiveYearService(SettingRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    /** Bir sınıfın kullanacağı ders planı yılı, örn. {classLevel: 2, planYear: "2025-2026"}. */
    public record ClassPlan(int classLevel, String planYear) {
    }

    /** Ekrana giden bilgi: {startYear: 2026, label: "2026-2027", updatedByName, updatedAt, classPlans: [...]}. */
    public record ActiveYear(int startYear, String label, String updatedByName, Instant updatedAt,
            List<ClassPlan> classPlans) {
    }

    @Transactional(readOnly = true)
    public ActiveYear get() {
        return toResponse(find());
    }

    /** Aktif yılı değiştirir; değiştirenin o anki görünen adı metin olarak yazılır. */
    @Transactional
    public ActiveYear set(int startYear, String changedByName) {
        if (startYear < MIN_YEAR || startYear > MAX_YEAR) {
            throw new BadRequestException("Yıl " + MIN_YEAR + " ile " + MAX_YEAR + " arasında olmalı.");
        }
        Setting setting = find();
        setting.change(String.valueOf(startYear), changedByName, Instant.now(clock));
        return toResponse(setting);
    }

    /** "2026" -> "2026-2027": ilk yıl girilince ikinci yıl otomatik bir fazlasıdır. */
    static String label(int startYear) {
        return startYear + "-" + (startYear + 1);
    }

    /** classLevel. sınıfın plan yılının ilk yılı: aktif ilk yıldan (sınıf - 1) geri gidilir. */
    static int planStartYear(int activeStartYear, int classLevel) {
        return activeStartYear - (classLevel - 1);
    }

    private ActiveYear toResponse(Setting setting) {
        int startYear = Integer.parseInt(setting.getValue());
        List<ClassPlan> plans = IntStream.rangeClosed(1, MAX_PLACEMENT_CLASS)
                .mapToObj(c -> new ClassPlan(c, label(planStartYear(startYear, c))))
                .toList();
        return new ActiveYear(startYear, label(startYear), setting.getUpdatedByName(), setting.getUpdatedAt(), plans);
    }

    // Satır V2 migration ile gelir; yoksa veritabanı eksik kurulmuştur.
    private Setting find() {
        return repository.findById(KEY)
                .orElseThrow(() -> new IllegalStateException("setting tablosunda " + KEY + " yok"));
    }
}
