package tr.edu.yalova.intibak.curriculum;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.function.IntFunction;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tr.edu.yalova.intibak.common.BadRequestException;
import tr.edu.yalova.intibak.common.NotFoundException;
import tr.edu.yalova.intibak.content.ContentDocument;

/**
 * Ders planları (Ayarlar > Ders planları): Excel yükleme, ekranda düzenleme, Excel'e aktarma ve "bu yıl için hangi
 * plan kullanılır" sorusu. Dersler kaydedilmeden önce kontrol edilir; hatalı satır varsa hiçbir şey kaydedilmez.
 */
@Service
public class CurriculumService {

    static final int MIN_YEAR = 2000;
    static final int MAX_YEAR = 2100;
    // NUMERIC(4,1) sütununa sığan en büyük değer.
    private static final BigDecimal MAX_NUMBER = new BigDecimal("999.9");
    // Bir dersin içeriği en fazla bu kadar karakter olabilir (V11 CHECK kuralıyla aynı).
    static final int MAX_CONTENT = 20000;
    private static final Locale TR = Locale.forLanguageTag("tr");

    private final CurriculumPlanRepository repository;
    private final Clock clock;

    public CurriculumService(CurriculumPlanRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    // ---- Ekrana giden ve ekrandan gelen veriler ----

    public record Summary(Long id, int startYear, String label, String sourceFileName, int courseCount) {
    }

    /**
     * Bir ders. Ekrandan gelirken de aynı alanlar kullanılır (CourseInput). content: dersin içeriği, her satır bir
     * konu (boşsa girilmemiş).
     */
    public record Course(Integer semester, String groupName, String code, String name, boolean compulsory,
            CourseLanguage language, BigDecimal theoryHours, BigDecimal practiceHours, BigDecimal credit,
            BigDecimal ects, String content) {
    }

    public record Detail(Long id, int startYear, String label, String sourceFileName, String createdByName,
            Instant createdAt, String updatedByName, Instant updatedAt, List<Course> courses) {
    }

    /** Ekrandan ya da Excel'den gelen ders; eksik alan olabilir, bu yüzden kutulu tipler (Boolean, null olabilir). */
    public record CourseInput(Integer semester, String groupName, String code, String name, Boolean compulsory,
            CourseLanguage language, BigDecimal theoryHours, BigDecimal practiceHours, BigDecimal credit,
            BigDecimal ects, String content) {
    }

    /**
     * İçerik belgesinden bir ders için bulunan içerik önerisi. hasContent: dersin planda zaten içeriği var mı (ekranda
     * varsayılan olarak sadece içeriği olmayanlar seçili gelir; var olan içerik kendiliğinden ezilmez).
     */
    public record ContentProposal(String code, String name, String content, boolean hasContent) {
    }

    /**
     * "Bu yıl için hangi plan kullanılır?" cevabı. exact=false ise o yılın planı yok, en yakın eski plan verilir;
     * planId=null ise o yıl ya da öncesine ait hiç plan yok.
     */
    public record Resolution(int requestedYear, String requestedLabel, Long planId, Integer planStartYear,
            String planLabel, boolean exact) {
    }

    // ---- İşlemler ----

    @Transactional(readOnly = true)
    public List<Summary> list() {
        return repository.findAllByOrderByStartYearAsc().stream()
                .map(p -> new Summary(p.getId(), p.getStartYear(), label(p.getStartYear()), p.getSourceFileName(),
                        p.getCourses().size()))
                .toList();
    }

    @Transactional(readOnly = true)
    public Detail get(long id) {
        return toDetail(find(id));
    }

    /**
     * Excel'den plan yükler. O yılın planı yoksa açılır; varsa dersleri dosyadakilerle değiştirilir (dosya düzeltilip
     * tekrar yüklenebilsin).
     */
    @Transactional
    public Detail importExcel(int startYear, String fileName, InputStream file, String actorName) {
        checkYear(startYear);
        PlanExcel.ReadResult read = PlanExcel.read(file);
        if (read.courses().isEmpty()) {
            throw new BadRequestException("Excel'de ders bulunamadı.");
        }
        List<PlanCourse> courses = validate(read.courses(), i -> "Excel " + read.excelRows().get(i) + ". satır");

        CurriculumPlan plan = repository.findByStartYear(startYear).orElse(null);
        if (plan != null) {
            keepContents(plan.getCourses(), courses);
        }
        if (plan == null) {
            // Yeni plan: oluşturan yazılır, "son değiştiren" boş kalır.
            plan = new CurriculumPlan(startYear, actorName, Instant.now(clock));
            plan.replaceCourses(courses, null, null);
        } else {
            plan.replaceCourses(courses, actorName, Instant.now(clock));
        }
        plan.setSourceFileName(fileName);
        return toDetail(repository.save(plan));
    }

    /** Ekrandaki düzenlemeyi kaydeder: planın tüm dersleri ekrandaki haliyle değişir. */
    @Transactional
    public Detail update(long id, List<CourseInput> inputs, String actorName) {
        CurriculumPlan plan = find(id);
        if (inputs == null || inputs.isEmpty()) {
            throw new BadRequestException("Planda en az bir ders olmalı.");
        }
        List<PlanCourse> courses = validate(inputs, i -> describe(inputs.get(i), i));
        plan.replaceCourses(courses, actorName, Instant.now(clock));
        return toDetail(plan);
    }

    /**
     * Yalova ders içerik belgesinin yazısını plandaki derslerin kodlarına göre böler (A2). Kodu olmayan ya da
     * "BSM4XX" gibi yer tutucu dersler aranmaz. Aynı kod planda birden çok kez varsa bir kez önerilir.
     */
    @Transactional(readOnly = true)
    public List<ContentProposal> proposeContents(long id, String text) {
        List<ContentDocument.Section> sections = ContentDocument.sections(text, "Belgenin başı");
        List<ContentProposal> proposals = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (PlanCourse c : find(id).getCourses()) {
            ContentDocument.Section section = ContentDocument.findByCode(sections, c.getCode());
            if (section != null && seen.add(ContentDocument.normalizeCode(c.getCode()))) {
                proposals.add(new ContentProposal(c.getCode(), c.getName(), normalizeContent(section.content()),
                        c.getContent() != null));
            }
        }
        if (proposals.isEmpty()) {
            throw new BadRequestException("Belgede plandaki derslerin kodları bulunamadı. Belgede dersler kodlarıyla"
                    + " (örn. BSM201) başlamalı; değilse içerikler elle yapıştırılabilir.");
        }
        return proposals;
    }

    /** Planı şablon biçiminde Excel'e aktarır (indirip düzeltip tekrar yüklemek için). */
    @Transactional(readOnly = true)
    public byte[] exportExcel(long id) {
        return PlanExcel.write(find(id).getCourses());
    }

    /** Boş şablon. */
    public byte[] template() {
        return PlanExcel.write(List.of());
    }

    /** Yılın planı varsa o, yoksa daha önceki en yeni plan (docs/devir-notu.md 1.2: "en yakın eski plan"). */
    @Transactional(readOnly = true)
    public Resolution resolve(int startYear) {
        checkYear(startYear);
        return repository.findFirstByStartYearLessThanEqualOrderByStartYearDesc(startYear)
                .map(p -> new Resolution(startYear, label(startYear), p.getId(), p.getStartYear(),
                        label(p.getStartYear()), p.getStartYear() == startYear))
                .orElse(new Resolution(startYear, label(startYear), null, null, null, false));
    }

    // ---- Kurallar ----

    /**
     * Ders kuralları (hata mesajında hangi satır/ders olduğu yazılır):
     * - Ders adı, Z/S, dil, kredi ve AKTS zorunlu; kod ve T/U saatleri boş olabilir.
     * - Yarıyıl 1-8 arası ya da boş; yarıyılı boş olan ders bir seçmeli havuzuna (grup) ait olmalı.
     * - Sayılar negatif olamaz, en fazla 999.9 ve virgülden sonra en fazla 1 hane (3.5 kredi gibi).
     */
    static List<PlanCourse> validate(List<CourseInput> inputs, IntFunction<String> labelOf) {
        List<PlanCourse> courses = new ArrayList<>();
        for (int i = 0; i < inputs.size(); i++) {
            CourseInput in = inputs.get(i);
            String prefix = labelOf.apply(i) + ": ";
            String name = blankToNull(in.name());
            String code = blankToNull(in.code());
            String group = blankToNull(in.groupName());

            if (name == null) {
                throw new BadRequestException(prefix + "ders adı girilmeli.");
            }
            if (name.length() > 200 || (code != null && code.length() > 20) || (group != null && group.length() > 100)) {
                throw new BadRequestException(prefix + "ders adı en fazla 200, kod 20, grup 100 karakter olabilir.");
            }
            if (in.semester() != null && (in.semester() < 1 || in.semester() > 8)) {
                throw new BadRequestException(prefix + "yarıyıl 1 ile 8 arasında olmalı.");
            }
            if (in.semester() == null && group == null) {
                throw new BadRequestException(prefix + "yarıyıl ya da seçmeli grup adı girilmeli.");
            }
            if (in.compulsory() == null) {
                throw new BadRequestException(prefix + "Z/S (zorunlu/seçmeli) seçilmeli.");
            }
            if (in.language() == null) {
                throw new BadRequestException(prefix + "dil (TR/EN) seçilmeli.");
            }
            if (in.credit() == null || in.ects() == null) {
                throw new BadRequestException(prefix + "kredi ve AKTS girilmeli.");
            }
            checkNumber(in.theoryHours(), prefix + "T");
            checkNumber(in.practiceHours(), prefix + "U");
            checkNumber(in.credit(), prefix + "kredi");
            checkNumber(in.ects(), prefix + "AKTS");

            String content = normalizeContent(in.content());
            if (content != null && content.length() > MAX_CONTENT) {
                throw new BadRequestException(prefix + "içerik en fazla " + MAX_CONTENT + " karakter olabilir.");
            }

            PlanCourse course = new PlanCourse(i, in.semester(), group, code, name, in.compulsory(), in.language(),
                    in.theoryHours(), in.practiceHours(), in.credit(), in.ects());
            course.setContent(content);
            courses.add(course);
        }
        return courses;
    }

    /**
     * İçerik metnini düzenler: her satır kırpılır, boş satırlar atlanır (her satır bir konu). Hiç konu yoksa null.
     */
    static String normalizeContent(String content) {
        if (content == null) {
            return null;
        }
        String joined = content.lines().map(String::trim).filter(line -> !line.isEmpty())
                .collect(Collectors.joining("\n"));
        return joined.isEmpty() ? null : joined;
    }

    /**
     * Excel tekrar yüklenince dersler yeniden oluşur; Excel'de içerik sütunu olmadığı için içerikler kaybolmasın diye
     * eski plandaki aynı kodlu ve aynı adlı dersin içeriği yeni derse aktarılır.
     */
    static void keepContents(List<PlanCourse> oldCourses, List<PlanCourse> newCourses) {
        Map<String, String> contents = new HashMap<>();
        for (PlanCourse c : oldCourses) {
            if (c.getContent() != null) {
                contents.putIfAbsent(courseKey(c), c.getContent());
            }
        }
        for (PlanCourse c : newCourses) {
            if (c.getContent() == null) {
                c.setContent(contents.get(courseKey(c)));
            }
        }
    }

    // Aynı ders mi? Kod ve ad; büyük/küçük harf ve fazla boşluk fark etmez.
    private static String courseKey(PlanCourse c) {
        String code = c.getCode() == null ? "" : c.getCode().trim().toUpperCase(TR);
        return code + "|" + c.getName().trim().replaceAll("\\s+", " ").toLowerCase(TR);
    }

    private static void checkNumber(BigDecimal value, String field) {
        if (value == null) {
            return;
        }
        // stripTrailingZeros: 3.50 -> 3.5 (1 hane), 4.00 -> 4 (0 hane); böylece "4.0" gibi yazımlar da geçer.
        if (value.signum() < 0 || value.compareTo(MAX_NUMBER) > 0 || value.stripTrailingZeros().scale() > 1) {
            throw new BadRequestException(field + " 0 ile 999.9 arasında, virgülden sonra en fazla 1 haneli olmalı.");
        }
    }

    // Ekrandan gelen ders için hata mesajında gösterilecek ad: "BSM151 Algorithms ..." ya da "3. ders".
    private static String describe(CourseInput in, int index) {
        String text = ((in.code() == null ? "" : in.code().trim()) + " "
                + (in.name() == null ? "" : in.name().trim())).trim();
        return text.isEmpty() ? (index + 1) + ". ders" : "\"" + text + "\"";
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static void checkYear(int startYear) {
        if (startYear < MIN_YEAR || startYear > MAX_YEAR) {
            throw new BadRequestException("Yıl " + MIN_YEAR + " ile " + MAX_YEAR + " arasında olmalı.");
        }
    }

    /** 2025 -> "2025-2026". */
    static String label(int startYear) {
        return startYear + "-" + (startYear + 1);
    }

    private CurriculumPlan find(long id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Ders planı bulunamadı."));
    }

    private static Detail toDetail(CurriculumPlan p) {
        List<Course> courses = p.getCourses().stream()
                .map(c -> new Course(c.getSemester(), c.getGroupName(), c.getCode(), c.getName(), c.isCompulsory(),
                        c.getLanguage(), c.getTheoryHours(), c.getPracticeHours(), c.getCredit(), c.getEcts(),
                        c.getContent()))
                .toList();
        return new Detail(p.getId(), p.getStartYear(), label(p.getStartYear()), p.getSourceFileName(),
                p.getCreatedByName(), p.getCreatedAt(), p.getUpdatedByName(), p.getUpdatedAt(), courses);
    }
}
