package tr.edu.yalova.intibak.record;

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

import tr.edu.yalova.intibak.curriculum.CourseLanguage;

/** Eşleştirme satırındaki bir ders. Yalova dersi de plandan METİN olarak kopyalanır (fatura mantığı). */
@Entity
@Table(name = "intibak_match_course")
public class IntibakMatchCourse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id")
    private IntibakMatch match;

    @Column(nullable = false)
    private int position;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MatchSide side;

    @Column(length = 20)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(precision = 4, scale = 1)
    private BigDecimal credit;

    @Column(precision = 4, scale = 1)
    private BigDecimal ects;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 2)
    private CourseLanguage language;

    @Column(length = 10)
    private String grade;

    protected IntibakMatchCourse() {
    }

    public IntibakMatchCourse(int position, MatchSide side, String code, String name, BigDecimal credit,
            BigDecimal ects, CourseLanguage language, String grade) {
        this.position = position;
        this.side = side;
        this.code = code;
        this.name = name;
        this.credit = credit;
        this.ects = ects;
        this.language = language;
        this.grade = grade;
    }

    void attachTo(IntibakMatch match) {
        this.match = match;
    }

    public MatchSide getSide() {
        return side;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getCredit() {
        return credit;
    }

    public BigDecimal getEcts() {
        return ects;
    }

    public CourseLanguage getLanguage() {
        return language;
    }

    public String getGrade() {
        return grade;
    }
}
