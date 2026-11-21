package tr.edu.yalova.intibak.record;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tr.edu.yalova.intibak.common.BadRequestException;

/** Kayıt kuralları: TC kontrolü, 4 durum geçişleri, iptal/geri al, arama ve TC gizleme. */
class RecordServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-21T10:00:00Z");
    // Resmi algoritmayı geçen örnek numara (gerçek bir kişiye ait değil, sadece kontrol hanesi tutuyor).
    private static final String VALID_TC = "10000000146";

    private IntibakRecordRepository repository;
    private RecordService service;

    @BeforeEach
    void setUp() {
        repository = mock(IntibakRecordRepository.class);
        service = new RecordService(repository, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static RecordService.Input input(String tc, String name) {
        return new RecordService.Input(tc, name, TransferType.YATAY, " Ankara Üniversitesi ", "",
                LocalDate.of(2026, 9, 15));
    }

    private IntibakRecord existing() {
        IntibakRecord record = new IntibakRecord(RecordService.validate(input(VALID_TC, "Ayşe Yılmaz")), "Üye 1", NOW);
        when(repository.findById(1L)).thenReturn(Optional.of(record));
        return record;
    }

    @Test
    void tcChecksum() {
        assertThat(TcNo.isValid(VALID_TC)).isTrue();
        assertThat(TcNo.isValid("10000000147")).isFalse();
        assertThat(TcNo.isValid("01234567890")).isFalse();
        assertThat(TcNo.isValid("123")).isFalse();
        assertThat(TcNo.mask("12345678901")).isEqualTo("123•••••901");
    }

    @Test
    void createStartsAsOlusturuluyorWithCreatorName() {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RecordService.Detail created = service.create(input(VALID_TC, "  Ayşe Yılmaz "), "Dr. Deneme");

        assertThat(created.status()).isEqualTo(RecordStatus.OLUSTURULUYOR);
        assertThat(created.fullName()).isEqualTo("Ayşe Yılmaz");
        assertThat(created.university()).isEqualTo("Ankara Üniversitesi");
        assertThat(created.facultyDepartment()).isNull();
        assertThat(created.createdByName()).isEqualTo("Dr. Deneme");
        assertThat(created.updatedByName()).isNull();
    }

    @Test
    void invalidInputIsRejected() {
        assertThatThrownBy(() -> RecordService.validate(input("10000000147", "Ayşe")))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("TC");
        assertThatThrownBy(() -> RecordService.validate(input(VALID_TC, " ")))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("Ad-soyad");
        assertThatThrownBy(() -> RecordService.validate(
                new RecordService.Input(VALID_TC, "Ayşe", null, null, null, null)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("Geçiş türü");
    }

    @Test
    void updateMovesToDegistiriliyorAndRecordsEditor() {
        existing();

        RecordService.Detail updated = service.update(1L, input(VALID_TC, "Ayşe Yılmaz Kaya"), "Üye 2");

        assertThat(updated.status()).isEqualTo(RecordStatus.DEGISTIRILIYOR);
        assertThat(updated.updatedByName()).isEqualTo("Üye 2");
        assertThat(updated.updatedAt()).isEqualTo(NOW);
        assertThat(updated.createdByName()).isEqualTo("Üye 1");
    }

    @Test
    void cancelAndRestoreReturnToPreviousStatus() {
        existing();
        service.update(1L, input(VALID_TC, "Ayşe"), "Üye 2");

        assertThat(service.cancel(1L, "Sekreter").status()).isEqualTo(RecordStatus.IPTAL);
        assertThatThrownBy(() -> service.update(1L, input(VALID_TC, "Ayşe"), "x"))
                .hasMessageContaining("İptal edilmiş kayıt değiştirilemez");
        assertThatThrownBy(() -> service.cancel(1L, "x")).hasMessageContaining("zaten iptal");

        RecordService.Detail restored = service.restore(1L, "Sekreter");
        assertThat(restored.status()).isEqualTo(RecordStatus.DEGISTIRILIYOR);
        assertThat(restored.updatedByName()).isEqualTo("Sekreter");
        assertThatThrownBy(() -> service.restore(1L, "x")).hasMessageContaining("iptal edilmemiş");
    }

    @Test
    void listSearchesNameAndTcAndMasksTc() {
        IntibakRecord ayse = new IntibakRecord(RecordService.validate(input(VALID_TC, "Ayşe Yılmaz")), "x", NOW);
        when(repository.findByStatusNotOrderByCreatedAtDesc(RecordStatus.IPTAL)).thenReturn(List.of(ayse));

        assertThat(service.list("AYŞE", false)).hasSize(1);
        assertThat(service.list("1000000", false)).hasSize(1);
        assertThat(service.list("mehmet", false)).isEmpty();
        assertThat(service.list(null, false).get(0).tcMasked()).isEqualTo("100•••••146");
    }
}
