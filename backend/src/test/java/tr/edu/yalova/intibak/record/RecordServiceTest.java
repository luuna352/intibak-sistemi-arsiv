package tr.edu.yalova.intibak.record;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tr.edu.yalova.intibak.common.BadRequestException;
import tr.edu.yalova.intibak.curriculum.CourseLanguage;
import tr.edu.yalova.intibak.curriculum.CurriculumPlanRepository;
import tr.edu.yalova.intibak.grade.GradeSystem;
import tr.edu.yalova.intibak.grade.GradeTable;
import tr.edu.yalova.intibak.grade.GradeTableRepository;
import tr.edu.yalova.intibak.grade.GradeTableRow;
import tr.edu.yalova.intibak.grade.YalovaGrade;
import tr.edu.yalova.intibak.setting.ActiveYearService;

/** Kayıt kuralları: TC kontrolü, 4 durum geçişleri, iptal/geri al, arama ve TC gizleme. */
class RecordServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-21T10:00:00Z");
    // Resmi algoritmayı geçen örnek numara (gerçek bir kişiye ait değil, sadece kontrol hanesi tutuyor).
    private static final String VALID_TC = "10000000146";

    private IntibakRecordRepository repository;
    private GradeTableRepository gradeTables;
    private RecordService service;

    @BeforeEach
    void setUp() {
        repository = mock(IntibakRecordRepository.class);
        gradeTables = mock(GradeTableRepository.class);
        // Ayarlardaki aktif yıl 2026 (2026-2027).
        ActiveYearService activeYear = mock(ActiveYearService.class);
        when(activeYear.startYear()).thenReturn(2026);
        service = new RecordService(repository, gradeTables, mock(CurriculumPlanRepository.class), activeYear,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static RecordService.Input input(String tc, String name) {
        return new RecordService.Input(tc, name, TransferType.YATAY, " Ankara Üniversitesi ", "",
                LocalDate.of(2026, 9, 15), null, null, null, null, List.of(), null, null, true);
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
    void academicYearDefaultsToActiveYearAndStaysWithTheRecord() {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        RecordService.Input base = input(VALID_TC, "Ayşe");

        // Yıl seçilmezse ayarlardaki aktif yıl yazılır.
        RecordService.Detail created = service.create(base, "Üye 1");
        assertThat(created.academicStartYear()).isEqualTo(2026);
        assertThat(created.academicYearLabel()).isEqualTo("2026-2027");

        // Komisyon başka bir yıl seçebilir.
        assertThat(service.create(withYear(base, 2025), "Üye 1").academicYearLabel()).isEqualTo("2025-2026");

        // Değiştirirken yıl gelmezse kaydın kendi yılı kalır, gelirse değişir.
        IntibakRecord record = existing();
        record.setAcademicStartYear(2024);
        assertThat(service.update(1L, base, "Üye 2").academicStartYear()).isEqualTo(2024);
        assertThat(service.update(1L, withYear(base, 2027), "Üye 2").academicStartYear()).isEqualTo(2027);

        // Aralık dışı yıl kaydedilmez.
        assertThatThrownBy(() -> service.create(withYear(base, 1999), "Üye 1"))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("Eğitim-öğretim yılı");
    }

    private static RecordService.Input withYear(RecordService.Input in, int year) {
        return new RecordService.Input(in.tcNo(), in.fullName(), in.transferType(), in.university(),
                in.facultyDepartment(), in.registrationDate(), in.prepStatus(), in.departmentLanguage(),
                in.gradeTableId(), in.planId(), in.matches(), in.placementClassLevel(), in.placementSemester(),
                in.confirmed(), in.sourceCourses(), year);
    }

    @Test
    void invalidInputIsRejected() {
        assertThatThrownBy(() -> RecordService.validate(input("10000000147", "Ayşe")))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("TC");
        assertThatThrownBy(() -> RecordService.validate(input(VALID_TC, " ")))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("Ad-soyad");
        assertThatThrownBy(() -> RecordService.validate(
                new RecordService.Input(VALID_TC, "Ayşe", null, null, null, null, null, null, null, null, null, null, null,
                        true)))
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

    @Test
    void saveNeedsConfirmation() {
        RecordService.Input notConfirmed = new RecordService.Input(VALID_TC, "Ayşe", TransferType.YATAY, null, null,
                null, null, null, null, null, List.of(), null, null, false);

        assertThatThrownBy(() -> service.create(notConfirmed, "x"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Onaylıyorum");
    }

    @Test
    void savesMatchesAndComputesPlacement() {
        GradeTable pt = new GradeTable("PT1", "100'lük", GradeSystem.SCORE, "x", NOW);
        pt.replace("100'lük", List.of(new GradeTableRow(0, null, new BigDecimal("90"), new BigDecimal("100"),
                YalovaGrade.AA)), "x", NOW);
        when(gradeTables.existsById(1L)).thenReturn(true);
        when(gradeTables.findById(1L)).thenReturn(Optional.of(pt));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        RecordService.MatchInput match = new RecordService.MatchInput(true,
                List.of(new RecordService.CourseInput(null, "Programlama", new BigDecimal("4"), null,
                        CourseLanguage.EN, "95", null)),
                List.of(new RecordService.CourseInput("BSM151", "Algorithms and Programming 1",
                        new BigDecimal("31"), new BigDecimal("7"), CourseLanguage.EN, null, null)));

        RecordService.Detail saved = service.create(new RecordService.Input(VALID_TC, "Ayşe", TransferType.YATAY,
                null, null, null, PrepStatus.PASSED, DepartmentLanguage.TR, 1L, null,
                List.of(match), null, null, true), "Üye 1");

        RecordService.MatchView view = saved.evaluation().matches().get(0);
        assertThat(view.incoming().get(0).convertedGrade()).isEqualTo(YalovaGrade.AA);
        assertThat(view.problems()).isEmpty();
        assertThat(saved.evaluation().placement().classLevel()).isEqualTo(2);

        // Dil farkı (Türkçe ders -> İngilizce Yalova dersi) sadece öneridir: komisyon sayarsa kayıt yapılır, uyarı durur.
        RecordService.MatchInput turkish = new RecordService.MatchInput(true,
                List.of(new RecordService.CourseInput(null, "Programlama", null, null, CourseLanguage.TR, "95", null)),
                match.yalova());
        RecordService.MatchView warned = service.create(new RecordService.Input(VALID_TC, "Ayşe", TransferType.YATAY,
                null, null, null, PrepStatus.PASSED, DepartmentLanguage.TR, 1L, null,
                List.of(turkish), null, null, true), "x").evaluation().matches().get(0);
        assertThat(warned.counted()).isTrue();
        assertThat(warned.suggestCounted()).isFalse();
        assertThat(warned.warnings()).anyMatch(w -> w.contains("Eğitim dili farklı"));

        // Eksik bilgi (not yok) ise "sayıldı" işaretli satır kaydedilemez.
        RecordService.MatchInput noGrade = new RecordService.MatchInput(true,
                List.of(new RecordService.CourseInput(null, "Programlama", null, null, CourseLanguage.EN, "", null)),
                match.yalova());
        assertThatThrownBy(() -> service.create(new RecordService.Input(VALID_TC, "Ayşe", TransferType.YATAY,
                null, null, null, PrepStatus.PASSED, DepartmentLanguage.TR, 1L, null,
                List.of(noGrade), null, null, true), "x"))
                .hasMessageContaining("1. satır sayılamaz");
    }

    @Test
    void savesTopicsAndComputesContentPercent() {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        // Karşı dersin konusundaki "karşılanıyor" işareti anlamsızdır, kaydedilmez; boş satırlar atlanır.
        RecordService.MatchInput match = new RecordService.MatchInput(false,
                List.of(new RecordService.CourseInput(null, "Data Structures", null, null, CourseLanguage.EN, "AA",
                        List.of(new RecordService.TopicInput(" Arrays ", true), new RecordService.TopicInput(" ", null)))),
                List.of(new RecordService.CourseInput("BSM201", "Veri Yapıları", null, null, CourseLanguage.TR, null,
                        List.of(new RecordService.TopicInput("Diziler", true),
                                new RecordService.TopicInput("Ağaçlar", false)))));

        RecordService.MatchView view = service.create(new RecordService.Input(VALID_TC, "Ayşe", TransferType.YATAY,
                null, null, null, null, null, null, null, List.of(match), null, null, true), "x")
                .evaluation().matches().get(0);

        assertThat(view.incoming().get(0).topics()).containsExactly(new RecordService.TopicView("Arrays", false));
        assertThat(view.yalova().get(0).topics()).hasSize(2);
        assertThat(view.contentPercent()).isEqualTo(50);
        assertThat(view.basis()).isEqualTo(MatchBasis.CONTENT);
    }

    @Test
    void incomingCourseIsTakenFromTheStudentsCourseList() {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        // Öğrencinin listesi: 2 ders, ikincisi eşleşmiyor ama listede kalıyor.
        List<RecordService.SourceCourseInput> sources = List.of(
                new RecordService.SourceCourseInput(" FIZ101 ", "Fizik I", "1", new BigDecimal("4"), new BigDecimal("6"),
                        CourseLanguage.TR, "BB"),
                new RecordService.SourceCourseInput(null, "Seramik Sanatı", "2", null, null, null, "AA"));
        // Eşleştirmedeki karşı dersin kendi alanları boş/yanlış olsa da listedeki 0. dersten alınır; içerik satırdan.
        // (PT seçilmediği için satır "sayılmadı" işaretli; yoksa eksik bilgi yüzünden kaydedilmez.)
        RecordService.MatchInput match = new RecordService.MatchInput(false,
                List.of(new RecordService.CourseInput(null, "yanlış ad", null, null, null, "FF",
                        List.of(new RecordService.TopicInput("Kinematik", null)), null, 0)),
                List.of(new RecordService.CourseInput("BSM103", "Fizik I", new BigDecimal("4"), null, CourseLanguage.TR,
                        null, null)));
        RecordService.Input input = new RecordService.Input(VALID_TC, "Ayşe", TransferType.YATAY, null, null, null,
                null, null, null, null, List.of(match), null, null, true, sources);

        RecordService.Detail saved = service.create(input, "x");

        assertThat(saved.sourceCourses()).hasSize(2);
        assertThat(saved.sourceCourses().get(0).code()).isEqualTo("FIZ101");
        assertThat(saved.sourceCourses().get(1).language()).isEqualTo(CourseLanguage.TR);
        RecordService.CourseView incoming = saved.evaluation().matches().get(0).incoming().get(0);
        assertThat(incoming.name()).isEqualTo("Fizik I");
        assertThat(incoming.grade()).isEqualTo("BB");
        assertThat(incoming.semester()).isEqualTo("1");
        assertThat(incoming.source()).isEqualTo(0);
        assertThat(incoming.topics()).extracting(RecordService.TopicView::text).containsExactly("Kinematik");
        // Ad aynı (kural 4) ve listedeki not BB: satır sorunsuz.
        assertThat(saved.evaluation().matches().get(0).basis()).isEqualTo(MatchBasis.SAME_NAME);

        // Önizleme de listeden okur; listede olmayan sıra numarası önizlemede atlanır, kaydetmede hata verir.
        RecordService.MatchInput broken = new RecordService.MatchInput(true,
                List.of(new RecordService.CourseInput(null, null, null, null, null, null, null, null, 5)),
                match.yalova());
        RecordService.Input brokenInput = new RecordService.Input(VALID_TC, "Ayşe", TransferType.YATAY, null, null,
                null, null, null, null, null, List.of(broken), null, null, true, sources);
        assertThat(service.evaluate(brokenInput).matches().get(0).incoming()).isEmpty();
        assertThatThrownBy(() -> service.create(brokenInput, "x")).hasMessageContaining("ders listesinde bulunamadı");

        // Listede adı boş ders kaydedilmez.
        RecordService.Input noName = new RecordService.Input(VALID_TC, "Ayşe", TransferType.YATAY, null, null, null,
                null, null, null, null, List.of(), null, null, true,
                List.of(new RecordService.SourceCourseInput(null, " ", null, null, null, null, null)));
        assertThatThrownBy(() -> service.create(noName, "x")).hasMessageContaining("1. satır: ders adı girilmeli");
    }

    @Test
    void commissionCanOverrideSuggestedPlacement() {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        RecordService.Input decided = new RecordService.Input(VALID_TC, "Ayşe", TransferType.YATAY, null, null, null,
                null, null, null, null, List.of(), 2, 4, true);

        // Sistem 0 krediyle 1. sınıf önerir; komisyonun 2. sınıf 4. dönem kararı ayrıca saklanır.
        RecordService.Detail saved = service.create(decided, "Üye 1");
        assertThat(saved.evaluation().placement().classLevel()).isEqualTo(1);
        assertThat(saved.placementClassLevel()).isEqualTo(2);
        assertThat(saved.placementSemester()).isEqualTo(4);

        // Boş bırakmak = öneriyi kullan; tek başına ya da sınıfa uymayan dönem reddedilir.
        RecordService.checkPlacement(null, null);
        assertThatThrownBy(() -> RecordService.checkPlacement(2, null)).hasMessageContaining("Sınıf/dönem");
        assertThatThrownBy(() -> RecordService.checkPlacement(2, 5)).hasMessageContaining("Sınıf/dönem");
        assertThatThrownBy(() -> RecordService.checkPlacement(5, 9)).hasMessageContaining("Sınıf/dönem");
    }
}
