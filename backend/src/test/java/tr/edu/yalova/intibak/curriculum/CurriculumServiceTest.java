package tr.edu.yalova.intibak.curriculum;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tr.edu.yalova.intibak.common.BadRequestException;

/** Ders planı kuralları: ders doğrulama, Excel'den yükleme, "plan yoksa en yakın eski plan". */
class CurriculumServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-21T10:00:00Z");

    private CurriculumPlanRepository repository;
    private CurriculumService service;

    @BeforeEach
    void setUp() {
        repository = mock(CurriculumPlanRepository.class);
        service = new CurriculumService(repository, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static CurriculumService.CourseInput course(Integer semester, String group, String credit) {
        return new CurriculumService.CourseInput(semester, group, "BSM101", "Ders", true, CourseLanguage.TR,
                new BigDecimal("3"), BigDecimal.ZERO, credit == null ? null : new BigDecimal(credit),
                new BigDecimal("5"), null);
    }

    @Test
    void validCoursesPassAndBlankTextBecomesNull() {
        List<PlanCourse> courses = CurriculumService.validate(List.of(
                course(1, " ", "3.5"), course(null, "5-6. yarıyıl teknik seçmeli", "3")), i -> "x");

        assertThat(courses).hasSize(2);
        assertThat(courses.get(0).getGroupName()).isNull();
        assertThat(courses.get(0).getCredit()).isEqualByComparingTo("3.5");
        assertThat(courses.get(1).getPosition()).isEqualTo(1);
    }

    @Test
    void courseNeedsSemesterOrGroup() {
        assertThatThrownBy(() -> CurriculumService.validate(List.of(course(null, null, "3")), i -> "Excel 5. satır"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Excel 5. satır: yarıyıl ya da seçmeli grup adı girilmeli.");
    }

    @Test
    void numbersAreChecked() {
        assertThatThrownBy(() -> CurriculumService.validate(List.of(course(9, null, "3")), i -> "x"))
                .hasMessageContaining("yarıyıl 1 ile 8");
        assertThatThrownBy(() -> CurriculumService.validate(List.of(course(1, null, "3.25")), i -> "x"))
                .hasMessageContaining("1 haneli");
        assertThatThrownBy(() -> CurriculumService.validate(List.of(course(1, null, "-1")), i -> "x"))
                .hasMessageContaining("kredi");
        assertThatThrownBy(() -> CurriculumService.validate(List.of(course(1, null, null)), i -> "x"))
                .hasMessageContaining("kredi ve AKTS girilmeli");
    }

    @Test
    void importCreatesNewPlanWithFileName() {
        when(repository.findByStartYear(2025)).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        byte[] file = PlanExcel.write(List.of(new PlanCourse(0, 1, null, "BSM151", "Programlama", true,
                CourseLanguage.EN, new BigDecimal("3"), new BigDecimal("2"), new BigDecimal("4"),
                new BigDecimal("7"))));

        CurriculumService.Detail plan = service.importExcel(2025, "plan.xlsx", new ByteArrayInputStream(file),
                "Dr. Deneme");

        assertThat(plan.label()).isEqualTo("2025-2026");
        assertThat(plan.sourceFileName()).isEqualTo("plan.xlsx");
        assertThat(plan.createdByName()).isEqualTo("Dr. Deneme");
        assertThat(plan.updatedByName()).isNull();
        assertThat(plan.courses()).hasSize(1);
    }

    @Test
    void contentIsNormalizedAndKeptWhenExcelIsReloaded() {
        // Her satır bir konu: satırlar kırpılır, boş satırlar atlanır; hiç konu yoksa içerik yok.
        assertThat(CurriculumService.normalizeContent("  Diziler \n\n Ağaçlar\r\n")).isEqualTo("Diziler\nAğaçlar");
        assertThat(CurriculumService.normalizeContent(" \n ")).isNull();

        // Var olan planda BSM201'in içeriği var; Excel tekrar yüklenince (içerik sütunu yok) içerik korunur.
        CurriculumPlan plan = new CurriculumPlan(2025, "x", NOW);
        PlanCourse old = new PlanCourse(0, 3, null, "BSM201", "Veri Yapıları", true, CourseLanguage.TR,
                new BigDecimal("3"), BigDecimal.ZERO, new BigDecimal("3"), new BigDecimal("5"));
        old.setContent("Diziler\nAğaçlar");
        plan.replaceCourses(List.of(old), null, null);
        when(repository.findByStartYear(2025)).thenReturn(Optional.of(plan));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        byte[] file = PlanExcel.write(List.of(
                new PlanCourse(0, 3, null, "bsm201", "Veri  Yapıları", true, CourseLanguage.TR, new BigDecimal("3"),
                        BigDecimal.ZERO, new BigDecimal("3"), new BigDecimal("5")),
                new PlanCourse(1, 3, null, "BSM202", "Veri Tabanı", true, CourseLanguage.TR, new BigDecimal("3"),
                        BigDecimal.ZERO, new BigDecimal("3"), new BigDecimal("5"))));

        CurriculumService.Detail reloaded = service.importExcel(2025, "plan.xlsx", new ByteArrayInputStream(file),
                "Sekreter");

        assertThat(reloaded.courses().get(0).content()).isEqualTo("Diziler\nAğaçlar");
        assertThat(reloaded.courses().get(1).content()).isNull();
    }

    @Test
    void emptyExcelIsRejected() {
        byte[] file = PlanExcel.write(List.of());

        assertThatThrownBy(() -> service.importExcel(2025, "bos.xlsx", new ByteArrayInputStream(file), "x"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ders bulunamadı");
    }

    @Test
    void missingYearFallsBackToNearestOlderPlan() {
        CurriculumPlan plan2025 = new CurriculumPlan(2025, "x", NOW);
        when(repository.findFirstByStartYearLessThanEqualOrderByStartYearDesc(2027)).thenReturn(Optional.of(plan2025));
        when(repository.findFirstByStartYearLessThanEqualOrderByStartYearDesc(2020)).thenReturn(Optional.empty());

        CurriculumService.Resolution fallback = service.resolve(2027);
        assertThat(fallback.exact()).isFalse();
        assertThat(fallback.requestedLabel()).isEqualTo("2027-2028");
        assertThat(fallback.planLabel()).isEqualTo("2025-2026");

        CurriculumService.Resolution none = service.resolve(2020);
        assertThat(none.planId()).isNull();
        assertThat(none.planLabel()).isNull();
    }
}
