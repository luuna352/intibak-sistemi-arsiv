package tr.edu.yalova.intibak.curriculum;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Ders planındaki bir ders: yarıyıl dersi (semester dolu) ya da seçmeli havuzu dersi (semester boş, grup dolu). */
@Entity
@Table(name = "plan_course")
public class PlanCourse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Dersin ait olduğu plan. LAZY: ders okunurken plan ayrıca yüklenmez, gerekirse yüklenir.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id")
    private CurriculumPlan plan;

    @Column(nullable = false)
    private int position;

    private Integer semester;

    @Column(name = "group_name", length = 100)
    private String groupName;

    @Column(length = 20)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false)
    private boolean compulsory;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 2)
    private CourseLanguage language;

    // NUMERIC(4,1): 999.9'a kadar, virgülden sonra 1 hane (3.5 kredi gibi).
    @Column(name = "theory_hours", precision = 4, scale = 1)
    private BigDecimal theoryHours;

    @Column(name = "practice_hours", precision = 4, scale = 1)
    private BigDecimal practiceHours;

    @Column(nullable = false, precision = 4, scale = 1)
    private BigDecimal credit;

    @Column(nullable = false, precision = 4, scale = 1)
    private BigDecimal ects;

    // Dersin içeriği, her satır bir konu (V11). Boşsa içerik girilmemiştir.
    @Column(columnDefinition = "TEXT")
    private String content;

    protected PlanCourse() {
    }

    public PlanCourse(int position, Integer semester, String groupName, String code, String name, boolean compulsory,
            CourseLanguage language, BigDecimal theoryHours, BigDecimal practiceHours, BigDecimal credit,
            BigDecimal ects) {
        this.position = position;
        this.semester = semester;
        this.groupName = groupName;
        this.code = code;
        this.name = name;
        this.compulsory = compulsory;
        this.language = language;
        this.theoryHours = theoryHours;
        this.practiceHours = practiceHours;
        this.credit = credit;
        this.ects = ects;
    }

    /** İçerik kurucuya değil buraya verilir: Excel'de içerik sütunu yok, içerik ayrıca girilir. */
    public void setContent(String content) {
        this.content = content;
    }

    public String getContent() {
        return content;
    }

    void attachTo(CurriculumPlan plan) {
        this.plan = plan;
    }

    public int getPosition() {
        return position;
    }

    public Integer getSemester() {
        return semester;
    }

    public String getGroupName() {
        return groupName;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public boolean isCompulsory() {
        return compulsory;
    }

    public CourseLanguage getLanguage() {
        return language;
    }

    public BigDecimal getTheoryHours() {
        return theoryHours;
    }

    public BigDecimal getPracticeHours() {
        return practiceHours;
    }

    public BigDecimal getCredit() {
        return credit;
    }

    public BigDecimal getEcts() {
        return ects;
    }
}
