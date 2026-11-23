package tr.edu.yalova.intibak.grade;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tr.edu.yalova.intibak.common.BadRequestException;

/** Not tablosu kuralları: satır doğrulama, çakışan aralıklar, yeni tablo kodu, kaydedenin adı. */
class GradeTableServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-21T10:00:00Z");

    private GradeTableRepository repository;
    private GradeTableService service;

    @BeforeEach
    void setUp() {
        repository = mock(GradeTableRepository.class);
        service = new GradeTableService(repository, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static GradeTableService.RowInput letter(String source, YalovaGrade target) {
        return new GradeTableService.RowInput(source, null, null, target);
    }

    private static GradeTableService.RowInput range(String min, String max, YalovaGrade target) {
        return new GradeTableService.RowInput(null, new BigDecimal(min), new BigDecimal(max), target);
    }

    @Test
    void validRowsPass() {
        List<GradeTableRow> rows = GradeTableService.validate(GradeSystem.SCORE, List.of(
                range("90", "100", YalovaGrade.AA), range("85", "89", YalovaGrade.BA), letter("A1", YalovaGrade.AA)));

        assertThat(rows).hasSize(3);
        assertThat(rows.get(1).getPosition()).isEqualTo(1);
    }

    @Test
    void overlappingRangesAreRejected() {
        assertThatThrownBy(() -> GradeTableService.validate(GradeSystem.SCORE, List.of(
                range("80", "85", YalovaGrade.BB), range("85", "89", YalovaGrade.BA))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("üst üste");
    }

    @Test
    void duplicateLetterIsRejectedIgnoringCase() {
        assertThatThrownBy(() -> GradeTableService.validate(GradeSystem.SCORE, List.of(
                letter("AA", YalovaGrade.AA), letter("aa", YalovaGrade.BA))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("2. satır");
    }

    @Test
    void rowNeedsLetterOrFullRange() {
        assertThatThrownBy(() -> GradeTableService.validate(GradeSystem.SCORE, List.of(
                new GradeTableService.RowInput(null, new BigDecimal("50"), null, YalovaGrade.DD))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("alt ve üst");
        assertThatThrownBy(() -> GradeTableService.validate(GradeSystem.SCORE, List.of(letter(" ", YalovaGrade.DD))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("harf notu ya da puan aralığı");
    }

    @Test
    void rangeMustStayWithin0To100AndTargetIsRequired() {
        assertThatThrownBy(() -> GradeTableService.validate(GradeSystem.SCORE, List.of(range("90", "110", YalovaGrade.AA))))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> GradeTableService.validate(GradeSystem.SCORE, List.of(range("70", "60", YalovaGrade.CC))))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> GradeTableService.validate(GradeSystem.SCORE, List.of(letter("A", null))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Yalova harf notu");
    }

    @Test
    void rowsFollowTheTableSystemLikeEk1() {
        // 100'lük puan (PT1): aralık ya da özel not (DEVAMSIZ) olur, ikisi aynı satırda olmaz.
        assertThat(GradeTableService.validate(GradeSystem.SCORE, List.of(
                range("90", "100", YalovaGrade.AA), letter("DEVAMSIZ", YalovaGrade.DZ)))).hasSize(2);
        assertThatThrownBy(() -> GradeTableService.validate(GradeSystem.SCORE, List.of(
                new GradeTableService.RowInput("A", new BigDecimal("90"), new BigDecimal("100"), YalovaGrade.AA))))
                .hasMessageContaining("ikisi birden");

        // Harf ve sayı (PT2): harf şart, sayı tek değer (alt = üst) ya da boş (F0).
        assertThat(GradeTableService.validate(GradeSystem.LETTER_NUMBER, List.of(
                new GradeTableService.RowInput("A-", new BigDecimal("3.70"), new BigDecimal("3.70"), YalovaGrade.AA),
                letter("F0", YalovaGrade.DZ)))).hasSize(2);
        assertThatThrownBy(() -> GradeTableService.validate(GradeSystem.LETTER_NUMBER, List.of(
                range("3", "4", YalovaGrade.AA))))
                .hasMessageContaining("harf notu girilmeli");
        assertThatThrownBy(() -> GradeTableService.validate(GradeSystem.LETTER_NUMBER, List.of(
                new GradeTableService.RowInput("A", new BigDecimal("3"), new BigDecimal("4"), YalovaGrade.AA))))
                .hasMessageContaining("tek bir sayı");

        // Sadece harf (PT3): sayı girilmez.
        assertThatThrownBy(() -> GradeTableService.validate(GradeSystem.LETTER, List.of(
                new GradeTableService.RowInput("A1", new BigDecimal("4"), new BigDecimal("4"), YalovaGrade.AA))))
                .hasMessageContaining("sayı girilmez");
    }

    @Test
    void newTableNeedsASystem() {
        assertThatThrownBy(() -> service.create("Özel", null, "x"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Not sistemi seçilmeli");
    }

    @Test
    void newTableGetsNextCodeAndCreatorName() {
        when(repository.findAll()).thenReturn(List.of(
                new GradeTable("PT1", "a", GradeSystem.SCORE, "x", NOW), new GradeTable("PT3", "b", GradeSystem.LETTER, "x", NOW)));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GradeTableService.Detail created = service.create("  Özel sistem  ", GradeSystem.LETTER, "Dr. Deneme");

        assertThat(created.code()).isEqualTo("PT4");
        assertThat(created.system()).isEqualTo(GradeSystem.LETTER);
        assertThat(created.name()).isEqualTo("Özel sistem");
        assertThat(created.createdByName()).isEqualTo("Dr. Deneme");
        assertThat(created.createdAt()).isEqualTo(NOW);
    }

    @Test
    void updateReplacesRowsAndShowsYalovaPoints() {
        GradeTable table = new GradeTable("PT1", "100'lük", GradeSystem.SCORE, "Sistem", NOW);
        when(repository.findById(1L)).thenReturn(Optional.of(table));

        GradeTableService.Detail saved = service.update(1L, "100'lük puan",
                List.of(range("90", "100", YalovaGrade.AA), range("0", "89", YalovaGrade.FF)), "Dr. Deneme");

        assertThat(saved.rows()).hasSize(2);
        assertThat(saved.rows().get(0).targetPoints()).isEqualByComparingTo("4.00");
        assertThat(saved.updatedByName()).isEqualTo("Dr. Deneme");
        assertThat(saved.updatedAt()).isEqualTo(NOW);
    }
}
