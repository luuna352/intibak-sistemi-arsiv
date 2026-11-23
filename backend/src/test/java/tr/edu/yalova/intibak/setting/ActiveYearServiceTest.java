package tr.edu.yalova.intibak.setting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.lang.reflect.Constructor;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tr.edu.yalova.intibak.common.BadRequestException;

/** Aktif yıl kuralları: etiket, sınıf -> plan yılı eşlemesi, değiştirme ve sınır kontrolü. */
class ActiveYearServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-21T10:00:00Z");

    private SettingRepository repository;
    private Setting setting;
    private ActiveYearService service;

    @BeforeEach
    void setUp() {
        repository = mock(SettingRepository.class);
        setting = newSetting("2026");
        when(repository.findById(ActiveYearService.KEY)).thenReturn(Optional.of(setting));
        service = new ActiveYearService(repository, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void secondYearIsAddedAutomatically() {
        assertThat(ActiveYearService.label(2026)).isEqualTo("2026-2027");
    }

    @Test
    void classesUseThePlanOfTheirEntryYear() {
        ActiveYearService.ActiveYear year = service.get();

        assertThat(year.label()).isEqualTo("2026-2027");
        assertThat(year.classPlans()).extracting(ActiveYearService.ClassPlan::planYear)
                .containsExactly("2026-2027", "2025-2026", "2024-2025", "2023-2024");
    }

    @Test
    void changeStoresNameTextAndTime() {
        ActiveYearService.ActiveYear year = service.set(2027, "Dr. Öğr. Üyesi Deneme");

        assertThat(year.label()).isEqualTo("2027-2028");
        assertThat(setting.getValue()).isEqualTo("2027");
        assertThat(setting.getUpdatedByName()).isEqualTo("Dr. Öğr. Üyesi Deneme");
        assertThat(setting.getUpdatedAt()).isEqualTo(NOW);
    }

    @Test
    void unrealisticYearIsRejected() {
        assertThatThrownBy(() -> service.set(26, "x")).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.set(3000, "x")).isInstanceOf(BadRequestException.class);
        assertThat(setting.getValue()).isEqualTo("2026");
    }

    // Setting'in constructor'ı protected (satırları JPA üretir); testte reflection ile kuruluyor.
    private static Setting newSetting(String value) {
        try {
            Constructor<Setting> constructor = Setting.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Setting s = constructor.newInstance();
            var key = Setting.class.getDeclaredField("key");
            key.setAccessible(true);
            key.set(s, ActiveYearService.KEY);
            s.change(value, null, null);
            return s;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
