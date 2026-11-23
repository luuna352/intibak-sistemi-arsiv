package tr.edu.yalova.intibak.record;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tr.edu.yalova.intibak.common.BadRequestException;
import tr.edu.yalova.intibak.common.NotFoundException;
import tr.edu.yalova.intibak.curriculum.CourseLanguage;
import tr.edu.yalova.intibak.curriculum.CurriculumPlanRepository;
import tr.edu.yalova.intibak.grade.GradeTable;
import tr.edu.yalova.intibak.grade.GradeTableRepository;
import tr.edu.yalova.intibak.grade.GradeTableRow;
import tr.edu.yalova.intibak.grade.YalovaGrade;

/**
 * İntibak kayıtları: listeleme/arama, kayıt açma, değiştirme, iptal ve iptali geri alma; formdaki ders eşleştirme
 * tablosu ve sınıf/dönem hesabı (hesapların kendisi MatchCalculator'da). Kayıt hiçbir zaman fiziksel olarak silinmez.
 * Her işlemde yapanın o anki görünen adı kayda metin olarak yazılır ("fatura mantığı").
 */
@Service
public class RecordService {

    private static final Locale TR = Locale.forLanguageTag("tr");
    private static final BigDecimal MAX_NUMBER = new BigDecimal("999.9");
    // Bir dersin en fazla konu sayısı ve bir konunun en fazla uzunluğu (V10'daki VARCHAR(500)).
    private static final int MAX_TOPICS = 100;
    private static final int MAX_TOPIC_LENGTH = 500;
    // Öğrencinin ders listesinde en fazla bu kadar ders (4 yıllık bir transkript 60-80 ders olur).
    private static final int MAX_SOURCE_COURSES = 200;

    private final IntibakRecordRepository repository;
    private final GradeTableRepository gradeTables;
    private final CurriculumPlanRepository plans;
    private final Clock clock;

    public RecordService(IntibakRecordRepository repository, GradeTableRepository gradeTables,
            CurriculumPlanRepository plans, Clock clock) {
        this.repository = repository;
        this.gradeTables = gradeTables;
        this.plans = plans;
        this.clock = clock;
    }

    // ---- Ekrana giden ve ekrandan gelen veriler ----

    /** Liste satırı. TC gizlenmiş gelir (123•••••901); tamamı sadece kaydın içinde görünür. */
    public record ListItem(Long id, String tcMasked, String fullName, TransferType transferType,
            String transferTypeLabel, String university, String createdByName, Instant createdAt,
            String updatedByName, Instant updatedAt, RecordStatus status, String statusLabel) {
    }

    /** Dersin bir konusu (kural 5). covered: Yalova konusu karşı derste karşılanıyor mu (komisyon işaretler). */
    public record TopicView(String text, boolean covered) {
    }

    /**
     * Eşleştirmedeki bir ders. convertedGrade: karşı kurum notunun Yalova karşılığı (Yalova dersinde boş). topics:
     * dersin içeriği, konu konu. source: karşı dersin öğrencinin ders listesindeki sırası (listeden seçilmediyse ya
     * da Yalova dersinde boş); semester: karşı dersin yarıyılı.
     */
    public record CourseView(String code, String name, BigDecimal credit, BigDecimal ects, CourseLanguage language,
            String grade, YalovaGrade convertedGrade, List<TopicView> topics, Integer source, String semester) {
    }

    /** Öğrencinin transkriptindeki bir ders (V14; eşleşmeyenler de listede durur). */
    public record SourceCourseView(String code, String name, String semester, BigDecimal credit, BigDecimal ects,
            CourseLanguage language, String grade) {
    }

    /**
     * Eşleştirme satırı ve hesap sonucu: birleşik not, Yalova kredisi, eksik bilgiler (problems: satır sayılamaz),
     * kural önerileri (warnings: komisyon yine de sayabilir), sistemin "sayılsın mı" önerisi ve satırın hangi
     * kuralla değerlendirildiği (basis: Türk Dili / tarih, aynı ad ya da içerik karşılaştırması) ve içerik
     * örtüşme yüzdesi (contentPercent: Yalova konusu girilmemişse boş; eşik yok, kararı komisyon verir).
     */
    public record MatchView(boolean counted, List<CourseView> incoming, List<CourseView> yalova, YalovaGrade grade,
            BigDecimal yalovaCredit, List<String> problems, List<String> warnings, boolean suggestCounted,
            MatchBasis basis, String basisLabel, Integer contentPercent) {
    }

    /** Formun hesap kısmı: satırların sonucu ve yerleşim (sayılan kredi, sınıf, dönem, gerekçe). */
    public record Evaluation(List<MatchView> matches, MatchCalculator.Placement placement) {
    }

    public record Detail(Long id, String tcNo, String fullName, TransferType transferType, String transferTypeLabel,
            String university, String facultyDepartment, LocalDate registrationDate, PrepStatus prepStatus,
            DepartmentLanguage departmentLanguage, RecordStatus status,
            String statusLabel, String createdByName, Instant createdAt, String updatedByName, Instant updatedAt,
            Long gradeTableId, Long planId, Evaluation evaluation, Integer placementClassLevel,
            Integer placementSemester, List<SourceCourseView> sourceCourses) {
    }

    public record TopicInput(String text, Boolean covered) {
    }

    /**
     * Formdan gelen ders. grade sadece karşı kurum dersinde dolu olur; topics: dersin içeriği, konu konu.
     * source: karşı ders öğrencinin ders listesinden seçildiyse listedeki sırası; o zaman kod, ad, yarıyıl, kredi,
     * AKTS, dil ve not listeden alınır (bu alanlarda gelen değerler kullanılmaz).
     */
    public record CourseInput(String code, String name, BigDecimal credit, BigDecimal ects, CourseLanguage language,
            String grade, List<TopicInput> topics, String semester, Integer source) {

        /** Listeye bağlı olmayan ders (yarıyılsız; testlerde ve Yalova derslerinde kısa yol). */
        public CourseInput(String code, String name, BigDecimal credit, BigDecimal ects, CourseLanguage language,
                String grade, List<TopicInput> topics) {
            this(code, name, credit, ects, language, grade, topics, null, null);
        }
    }

    /** Öğrencinin ders listesindeki bir ders (formdaki iki sütunlu ekranın sol tarafı). */
    public record SourceCourseInput(String code, String name, String semester, BigDecimal credit, BigDecimal ects,
            CourseLanguage language, String grade) {
    }

    public record MatchInput(Boolean counted, List<CourseInput> incoming, List<CourseInput> yalova) {
    }

    /**
     * Formun tamamı: öğrenci bilgileri, PT, plan, eşleştirme satırları ve "Kontrol ettim / Onaylıyorum" kutusu.
     * Kutu işaretli değilse (confirmed != true) kayıt yapılmaz. placementClassLevel/placementSemester: komisyonun
     * sınıf/dönem kararı; ikisi de boşsa sistemin önerisi geçerlidir. sourceCourses: öğrencinin ders listesi.
     */
    public record Input(String tcNo, String fullName, TransferType transferType, String university,
            String facultyDepartment, LocalDate registrationDate, PrepStatus prepStatus,
            DepartmentLanguage departmentLanguage, Long gradeTableId, Long planId, List<MatchInput> matches,
            Integer placementClassLevel, Integer placementSemester, Boolean confirmed,
            List<SourceCourseInput> sourceCourses) {

        /** Ders listesi olmadan (eski biçim; testlerde kısa yol). */
        public Input(String tcNo, String fullName, TransferType transferType, String university,
                String facultyDepartment, LocalDate registrationDate, PrepStatus prepStatus,
                DepartmentLanguage departmentLanguage, Long gradeTableId, Long planId, List<MatchInput> matches,
                Integer placementClassLevel, Integer placementSemester, Boolean confirmed) {
            this(tcNo, fullName, transferType, university, facultyDepartment, registrationDate, prepStatus,
                    departmentLanguage, gradeTableId, planId, matches, placementClassLevel, placementSemester,
                    confirmed, null);
        }
    }

    /** Açılır liste seçeneği: {"value": "YATAY", "label": "Yatay geçiş"}. */
    public record Option(String value, String label) {
    }

    /** Kayıt durumları ekranı: her durumdan kaç kayıt var. */
    public record StatusCount(RecordStatus status, String label, long count) {
    }

    // ---- İşlemler ----

    /**
     * Liste. query boş değilse TC'de ya da ad-soyadda geçen kayıtlar (büyük/küçük harf farkı yok); iptal edilenler
     * sadece includeCancelled=true ise gelir.
     */
    @Transactional(readOnly = true)
    public List<ListItem> list(String query, boolean includeCancelled) {
        List<IntibakRecord> records = includeCancelled
                ? repository.findAllByOrderByCreatedAtDesc()
                : repository.findByStatusNotOrderByCreatedAtDesc(RecordStatus.IPTAL);
        String q = query == null ? "" : query.trim().toLowerCase(TR);
        return records.stream()
                .filter(r -> q.isEmpty() || r.getTcNo().contains(q) || r.getFullName().toLowerCase(TR).contains(q))
                .map(RecordService::toListItem)
                .toList();
    }

    @Transactional(readOnly = true)
    public Detail get(long id) {
        return toDetail(find(id));
    }

    /**
     * Aynı öğrencinin (aynı TC) diğer kayıtları, iptal edilenler dahil, en eskisi üstte. Öğrenci birden çok yatay
     * geçiş yaptıysa her önceki üniversite ayrı kayıttır; komisyon BL gibi notsuz geçirilmiş dersin gerçek harfini
     * diğer kaydın transkriptinden bulur. excludeId: formda açık olan kayıt (listede tekrar görünmesin). TC geçersizse
     * boş liste (form yazılırken her harfte sorulabilir).
     */
    @Transactional(readOnly = true)
    public List<ListItem> sameStudent(String tcNo, Long excludeId) {
        String tc = tcNo == null ? "" : tcNo.replace(" ", "");
        if (!TcNo.isValid(tc)) {
            return List.of();
        }
        return repository.findByTcNoOrderByCreatedAtAsc(tc).stream()
                .filter(r -> excludeId == null || !excludeId.equals(r.getId()))
                .map(RecordService::toListItem)
                .toList();
    }

    /**
     * Önizleme: formdaki eşleştirmeyi kaydetmeden hesaplar (ekrandaki "Yalova notu", "sayılan kredi", "sınıf"
     * alanları her değişiklikte bununla güncellenir). Yarım girilmiş satırlar hata vermez, sorun olarak döner.
     */
    @Transactional(readOnly = true)
    public Evaluation evaluate(Input input) {
        List<MatchInput> matches = input == null || input.matches() == null ? List.of() : input.matches();
        List<SourceCourseInput> sources = sourcesOf(input);
        List<Lenient> lenient = matches.stream().map(m -> lenient(m, sources)).toList();
        return evaluation(lenient.stream().map(Lenient::in).toList(), lenient.stream().map(Lenient::links).toList(),
                rowsOf(input == null ? null : input.gradeTableId()),
                input == null ? null : input.transferType(), prepOf(input), departmentOf(input));
    }

    @Transactional
    public Detail create(Input input, String actorName) {
        Prepared prepared = prepare(input);
        IntibakRecord record = new IntibakRecord(prepared.info(), actorName, Instant.now(clock));
        record.replaceSourceCourses(prepared.sources());
        record.replaceMatches(input.gradeTableId(), input.planId(), prepared.matches());
        record.decidePlacement(input.placementClassLevel(), input.placementSemester());
        return toDetail(repository.save(record));
    }

    @Transactional
    public Detail update(long id, Input input, String actorName) {
        IntibakRecord record = find(id);
        if (record.isCancelled()) {
            throw new BadRequestException("İptal edilmiş kayıt değiştirilemez. Önce iptali geri alın.");
        }
        Prepared prepared = prepare(input);
        record.update(prepared.info(), actorName, Instant.now(clock));
        record.replaceSourceCourses(prepared.sources());
        record.replaceMatches(input.gradeTableId(), input.planId(), prepared.matches());
        record.decidePlacement(input.placementClassLevel(), input.placementSemester());
        return toDetail(record);
    }

    @Transactional
    public Detail cancel(long id, String actorName) {
        IntibakRecord record = find(id);
        if (record.isCancelled()) {
            throw new BadRequestException("Kayıt zaten iptal edilmiş.");
        }
        record.cancel(actorName, Instant.now(clock));
        return toDetail(record);
    }

    @Transactional
    public Detail restore(long id, String actorName) {
        IntibakRecord record = find(id);
        if (!record.isCancelled()) {
            throw new BadRequestException("Kayıt iptal edilmemiş.");
        }
        record.restore(actorName, Instant.now(clock));
        return toDetail(record);
    }

    /** Her durumdan kaç kayıt var (sayısı 0 olan durumlar da listelenir). */
    @Transactional(readOnly = true)
    public List<StatusCount> statusCounts() {
        Map<RecordStatus, Long> counts = repository.findAll().stream()
                .collect(Collectors.groupingBy(IntibakRecord::getStatus, Collectors.counting()));
        return Arrays.stream(RecordStatus.values())
                .map(s -> new StatusCount(s, s.label(), counts.getOrDefault(s, 0L)))
                .toList();
    }

    public List<Option> transferTypes() {
        return Arrays.stream(TransferType.values()).map(t -> new Option(t.name(), t.label())).toList();
    }

    // ---- Kurallar ----

    private record Prepared(IntibakRecord.StudentInfo info, List<IntibakMatch> matches,
            List<IntibakSourceCourse> sources) {
    }

    // Karşı dersin listeye bağlantısı (ekranda hangi satırdan geldiği ve yarıyılı); hesaba girmez, sadece gösterilir.
    private record Link(Integer source, String semester) {
    }

    // Önizlemede bir satır: hesaba giren hali ve karşı derslerin bağlantıları (aynı sırayla).
    private record Lenient(MatchCalculator.MatchIn in, List<Link> links) {
    }

    /**
     * Kaydetmeden önceki kontroller (sırayla): onay kutusu, öğrenci bilgileri, PT ve plan, her dersin alanları,
     * "sayıldı" işaretli satırlarda eksik bilgi olmaması (kural uyarısı engel değil: karar komisyonun). Bir kural tutmazsa hiçbir şey kaydedilmez.
     */
    private Prepared prepare(Input in) {
        if (in == null || !Boolean.TRUE.equals(in.confirmed())) {
            throw new BadRequestException("Kaydetmek için \"Kontrol ettim / Onaylıyorum\" kutusu işaretlenmeli.");
        }
        IntibakRecord.StudentInfo info = validate(in);
        if (in.gradeTableId() != null && !gradeTables.existsById(in.gradeTableId())) {
            throw new BadRequestException("Seçilen not dönüşüm tablosu bulunamadı.");
        }
        if (in.planId() != null && !plans.existsById(in.planId())) {
            throw new BadRequestException("Seçilen ders planı bulunamadı.");
        }
        checkPlacement(in.placementClassLevel(), in.placementSemester());

        // Öğrencinin ders listesi: her satırın adı zorunlu, sayılar ve metin uzunlukları kontrol edilir.
        List<SourceCourseInput> sources = sourcesOf(in);
        if (sources.size() > MAX_SOURCE_COURSES) {
            throw new BadRequestException("Öğrencinin ders listesine en fazla " + MAX_SOURCE_COURSES
                    + " ders girilebilir.");
        }
        List<IntibakSourceCourse> sourceEntities = new ArrayList<>();
        for (int i = 0; i < sources.size(); i++) {
            sourceEntities.add(sourceCourse(i, sources.get(i)));
        }

        List<MatchInput> inputs = in.matches() == null ? List.of() : in.matches();
        List<MatchCalculator.MatchIn> ins = new ArrayList<>();
        List<IntibakMatch> matches = new ArrayList<>();
        for (int i = 0; i < inputs.size(); i++) {
            MatchInput m = inputs.get(i);
            String prefix = "Eşleştirme " + (i + 1) + ". satır: ";
            List<CourseInput> incoming = m.incoming() == null ? List.of() : m.incoming();
            List<CourseInput> yalova = m.yalova() == null ? List.of() : m.yalova();
            List<IntibakMatchCourse> courses = new ArrayList<>();
            for (CourseInput c : incoming) {
                courses.add(course(courses.size(), MatchSide.INCOMING, resolveStrict(c, sources, prefix), prefix));
            }
            for (CourseInput c : yalova) {
                courses.add(course(courses.size(), MatchSide.YALOVA, c, prefix));
            }
            boolean counted = Boolean.TRUE.equals(m.counted());
            matches.add(new IntibakMatch(i, counted, courses));
            ins.add(new MatchCalculator.MatchIn(counted, toCalc(courses, MatchSide.INCOMING),
                    toCalc(courses, MatchSide.YALOVA)));
        }

        // "Sayıldı" işaretli satırda eksik bilgi olmamalı (örn. not girilmemiş ya da tabloda yok: hesap yapılamaz).
        // Dil farkı, başarısız not gibi kural uyarıları kaydı engellemez; komisyon bilerek sayabilir (kural 8).
        List<GradeTableRow> rows = rowsOf(in.gradeTableId());
        for (int i = 0; i < ins.size(); i++) {
            MatchCalculator.MatchResult result = MatchCalculator.evaluate(ins.get(i), rows, info.prepStatus(),
                    info.departmentLanguage());
            if (ins.get(i).counted() && !result.problems().isEmpty()) {
                throw new BadRequestException("Eşleştirme " + (i + 1) + ". satır sayılamaz: "
                        + String.join(" ", result.problems()));
            }
        }
        return new Prepared(info, matches, sourceEntities);
    }

    private static List<SourceCourseInput> sourcesOf(Input in) {
        return in == null || in.sourceCourses() == null ? List.of() : in.sourceCourses();
    }

    /** Öğrencinin ders listesindeki bir satır: ad zorunlu, sayılar 0-999.9, dil boşsa TR. */
    private static IntibakSourceCourse sourceCourse(int position, SourceCourseInput s) {
        String prefix = "Öğrencinin ders listesi " + (position + 1) + ". satır: ";
        String name = s == null ? null : text(s.name(), 200, prefix + "ders adı");
        if (name == null) {
            throw new BadRequestException(prefix + "ders adı girilmeli.");
        }
        checkNumber(s.credit(), prefix + name + " kredisi");
        checkNumber(s.ects(), prefix + name + " AKTS'si");
        return new IntibakSourceCourse(position, text(s.code(), 20, prefix + "ders kodu"), name,
                text(s.semester(), 20, prefix + name + " yarıyılı"), s.credit(), s.ects(),
                s.language() == null ? CourseLanguage.TR : s.language(), text(s.grade(), 10, prefix + name + " notu"));
    }

    /**
     * Karşı ders listeden seçildiyse (source dolu) bilgileri listedeki dersten alınır: ekranda listede düzeltilen
     * not ya da kredi eşleştirmeye de yansır. İçerik (topics) eşleştirmenin kendisinden gelir. Sıra numarası listede
     * yoksa null döner.
     */
    private static CourseInput resolve(CourseInput c, List<SourceCourseInput> sources) {
        if (c == null || c.source() == null) {
            return c;
        }
        if (c.source() < 0 || c.source() >= sources.size() || sources.get(c.source()) == null) {
            return null;
        }
        SourceCourseInput s = sources.get(c.source());
        return new CourseInput(s.code(), s.name(), s.credit(), s.ects(), s.language(), s.grade(), c.topics(),
                s.semester(), c.source());
    }

    // Kaydederken listede olmayan bir derse bağlanmış karşı ders hata verir (önizlemede ise sessizce atlanır).
    private static CourseInput resolveStrict(CourseInput c, List<SourceCourseInput> sources, String prefix) {
        CourseInput resolved = resolve(c, sources);
        if (resolved == null) {
            throw new BadRequestException(prefix + "karşı ders öğrencinin ders listesinde bulunamadı.");
        }
        return resolved;
    }

    /** TC (resmi algoritmayla), ad-soyad ve geçiş türü zorunlu; metinler kırpılır, boş metin = değer yok. */
    static IntibakRecord.StudentInfo validate(Input in) {
        if (in == null) {
            throw new BadRequestException("Kayıt bilgileri gelmedi.");
        }
        String tc = in.tcNo() == null ? "" : in.tcNo().replace(" ", "");
        if (!TcNo.isValid(tc)) {
            throw new BadRequestException("TC Kimlik No geçersiz (11 hane, resmi kontrol hanesi tutmalı).");
        }
        String fullName = text(in.fullName(), 200, "Ad-soyad");
        if (fullName == null) {
            throw new BadRequestException("Ad-soyad girilmeli.");
        }
        if (in.transferType() == null) {
            throw new BadRequestException("Geçiş türü seçilmeli.");
        }
        return new IntibakRecord.StudentInfo(tc, fullName, in.transferType(),
                text(in.university(), 200, "Geldiği üniversite"),
                text(in.facultyDepartment(), 300, "Fakülte / bölüm"),
                in.registrationDate(), prepOf(in), departmentOf(in));
    }

    // Hazırlık ve bölüm dili seçilmemişse "Bilinmiyor" sayılır (kural 2b: o zaman bilgi istenir).
    private static PrepStatus prepOf(Input in) {
        return in == null || in.prepStatus() == null ? PrepStatus.UNKNOWN : in.prepStatus();
    }

    private static DepartmentLanguage departmentOf(Input in) {
        return in == null || in.departmentLanguage() == null ? DepartmentLanguage.UNKNOWN : in.departmentLanguage();
    }

    // Kaydedilecek ders: ad zorunlu, sayılar 0-999.9 ve en fazla 1 ondalık, dil boşsa TR.
    private static IntibakMatchCourse course(int position, MatchSide side, CourseInput c, String prefix) {
        String name = text(c.name(), 200, prefix + "ders adı");
        if (name == null) {
            throw new BadRequestException(prefix + (side == MatchSide.INCOMING ? "karşı kurum" : "Yalova")
                    + " dersinin adı girilmeli.");
        }
        checkNumber(c.credit(), prefix + name + " kredisi");
        checkNumber(c.ects(), prefix + name + " AKTS'si");
        String grade = side == MatchSide.INCOMING ? text(c.grade(), 10, prefix + name + " notu") : null;
        IntibakMatchCourse course = new IntibakMatchCourse(position, side, text(c.code(), 20, prefix + "ders kodu"),
                name, c.credit(), c.ects(), c.language() == null ? CourseLanguage.TR : c.language(), grade);
        if (side == MatchSide.INCOMING) {
            course.linkToSource(c.source(), text(c.semester(), 20, prefix + name + " yarıyılı"));
        }
        List<MatchCalculator.Topic> topics = topics(c, side);
        if (topics.size() > MAX_TOPICS) {
            throw new BadRequestException(prefix + name + ": en fazla " + MAX_TOPICS + " konu girilebilir.");
        }
        List<IntibakMatchTopic> entities = new ArrayList<>();
        for (MatchCalculator.Topic t : topics) {
            if (t.text().length() > MAX_TOPIC_LENGTH) {
                throw new BadRequestException(prefix + name + ": bir konu en fazla " + MAX_TOPIC_LENGTH
                        + " karakter olabilir.");
            }
            entities.add(new IntibakMatchTopic(entities.size(), t.text(), t.covered()));
        }
        course.replaceTopics(entities);
        return course;
    }

    /**
     * Formdan gelen konular: metinler kırpılır, boş satırlar atlanır. "Karşılanıyor" işareti sadece Yalova
     * konularında anlamlıdır (karşı dersin konusunda her zaman false).
     */
    private static List<MatchCalculator.Topic> topics(CourseInput c, MatchSide side) {
        return (c.topics() == null ? List.<TopicInput>of() : c.topics()).stream()
                .filter(t -> t != null && t.text() != null && !t.text().isBlank())
                .map(t -> new MatchCalculator.Topic(t.text().trim(),
                        side == MatchSide.YALOVA && Boolean.TRUE.equals(t.covered())))
                .toList();
    }

    /**
     * Komisyonun sınıf/dönem kararı: ikisi de boş (sistemin önerisi) ya da ikisi birlikte; sınıf 1-4 ve dönem o
     * sınıfın iki döneminden biri (2. sınıf: 3 ya da 4). Veritabanındaki CHECK kuralıyla aynı; burada anlaşılır bir
     * mesaj vermek için tekrar kontrol edilir.
     */
    static void checkPlacement(Integer classLevel, Integer semester) {
        if (classLevel == null && semester == null) {
            return;
        }
        if (classLevel == null || semester == null || classLevel < 1 || classLevel > 4
                || (semester != classLevel * 2 - 1 && semester != classLevel * 2)) {
            throw new BadRequestException("Sınıf/dönem kararı geçersiz: sınıf 1-4 olmalı, dönem o sınıfın dönemlerinden"
                    + " biri olmalı (örn. 2. sınıf: 3 ya da 4. dönem).");
        }
    }

    private static void checkNumber(BigDecimal value, String field) {
        if (value != null && (value.signum() < 0 || value.compareTo(MAX_NUMBER) > 0
                || value.stripTrailingZeros().scale() > 1)) {
            throw new BadRequestException(field + " 0 ile 999.9 arasında, virgülden sonra en fazla 1 haneli olmalı.");
        }
    }

    // Önizlemede yarım satırlar hata vermez: adı boş dersler ve listede bulunamayan karşı dersler yok sayılır.
    private static Lenient lenient(MatchInput m, List<SourceCourseInput> sources) {
        List<CourseInput> incoming = named((m.incoming() == null ? List.<CourseInput>of() : m.incoming()).stream()
                .map(c -> resolve(c, sources)).toList());
        return new Lenient(new MatchCalculator.MatchIn(Boolean.TRUE.equals(m.counted()),
                toCalcInputs(incoming, MatchSide.INCOMING), toCalcInputs(named(m.yalova()), MatchSide.YALOVA)),
                incoming.stream().map(c -> new Link(c.source(), c.semester())).toList());
    }

    private static List<CourseInput> named(List<CourseInput> courses) {
        return (courses == null ? List.<CourseInput>of() : courses).stream()
                .filter(c -> c != null && c.name() != null && !c.name().isBlank())
                .toList();
    }

    private static List<MatchCalculator.CourseIn> toCalcInputs(List<CourseInput> courses, MatchSide side) {
        return courses.stream()
                .map(c -> new MatchCalculator.CourseIn(c.code(), c.name().trim(), c.credit(), c.ects(),
                        c.language() == null ? CourseLanguage.TR : c.language(), c.grade(), topics(c, side)))
                .toList();
    }

    private static List<MatchCalculator.CourseIn> toCalc(List<IntibakMatchCourse> courses, MatchSide side) {
        return courses.stream().filter(c -> c.getSide() == side)
                .map(c -> new MatchCalculator.CourseIn(c.getCode(), c.getName(), c.getCredit(), c.getEcts(),
                        c.getLanguage(), c.getGrade(), c.getTopics().stream()
                                .map(t -> new MatchCalculator.Topic(t.getText(), t.isCovered())).toList()))
                .toList();
    }

    private List<GradeTableRow> rowsOf(Long gradeTableId) {
        return gradeTableId == null ? null
                : gradeTables.findById(gradeTableId).map(GradeTable::getRows).orElse(null);
    }

    // Hesap sonucunu ekrana gidecek biçime çevirir (her karşı dersin yanına Yalova karşılığı eklenir).
    // links: her satırın karşı derslerinin listeye bağlantısı (ins ile aynı sırada).
    private static Evaluation evaluation(List<MatchCalculator.MatchIn> ins, List<List<Link>> links,
            List<GradeTableRow> rows, TransferType transferType, PrepStatus prep, DepartmentLanguage department) {
        MatchCalculator.Evaluation result = MatchCalculator.evaluate(ins, rows, transferType, prep, department);
        List<MatchView> views = new ArrayList<>();
        for (int i = 0; i < ins.size(); i++) {
            MatchCalculator.MatchIn in = ins.get(i);
            MatchCalculator.MatchResult r = result.matches().get(i);
            List<CourseView> incoming = new ArrayList<>();
            for (int j = 0; j < in.incoming().size(); j++) {
                incoming.add(view(in.incoming().get(j), r.incomingGrades().get(j), links.get(i).get(j)));
            }
            List<CourseView> yalova = in.yalova().stream().map(c -> view(c, null, new Link(null, null))).toList();
            views.add(new MatchView(in.counted(), incoming, yalova, r.grade(), r.yalovaCredit(), r.problems(),
                    r.warnings(), r.suggestCounted(), r.basis(), r.basis() == null ? null : r.basis().label(),
                    r.contentPercent()));
        }
        return new Evaluation(views, result.placement());
    }

    private static CourseView view(MatchCalculator.CourseIn c, YalovaGrade converted, Link link) {
        return new CourseView(c.code(), c.name(), c.credit(), c.ects(), c.language(), c.grade(), converted,
                c.topics().stream().map(t -> new TopicView(t.text(), t.covered())).toList(), link.source(),
                link.semester());
    }

    private static String text(String value, int max, String field) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() > max) {
            throw new BadRequestException(field + " en fazla " + max + " karakter olabilir.");
        }
        return trimmed;
    }

    private IntibakRecord find(long id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Kayıt bulunamadı."));
    }

    private static ListItem toListItem(IntibakRecord r) {
        return new ListItem(r.getId(), TcNo.mask(r.getTcNo()), r.getFullName(), r.getTransferType(),
                r.getTransferType().label(), r.getUniversity(), r.getCreatedByName(), r.getCreatedAt(),
                r.getUpdatedByName(), r.getUpdatedAt(), r.getStatus(), r.getStatus().label());
    }

    private Detail toDetail(IntibakRecord r) {
        List<MatchCalculator.MatchIn> ins = r.getMatches().stream()
                .map(m -> new MatchCalculator.MatchIn(m.isCounted(), toCalc(m.getCourses(), MatchSide.INCOMING),
                        toCalc(m.getCourses(), MatchSide.YALOVA)))
                .toList();
        List<List<Link>> links = r.getMatches().stream()
                .map(m -> m.coursesOn(MatchSide.INCOMING).stream()
                        .map(c -> new Link(c.getSourcePosition(), c.getSemester())).toList())
                .toList();
        Evaluation evaluation = evaluation(ins, links, rowsOf(r.getGradeTableId()), r.getTransferType(),
                r.getPrepStatus(), r.getDepartmentLanguage());
        List<SourceCourseView> sources = r.getSourceCourses().stream()
                .map(s -> new SourceCourseView(s.getCode(), s.getName(), s.getSemester(), s.getCredit(), s.getEcts(),
                        s.getLanguage(), s.getGrade()))
                .toList();
        return new Detail(r.getId(), r.getTcNo(), r.getFullName(), r.getTransferType(), r.getTransferType().label(),
                r.getUniversity(), r.getFacultyDepartment(), r.getRegistrationDate(), r.getPrepStatus(),
                r.getDepartmentLanguage(), r.getStatus(),
                r.getStatus().label(), r.getCreatedByName(), r.getCreatedAt(), r.getUpdatedByName(),
                r.getUpdatedAt(), r.getGradeTableId(), r.getPlanId(), evaluation, r.getPlacementClassLevel(),
                r.getPlacementSemester(), sources);
    }
}
