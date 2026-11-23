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

/**
 * Öğrencinin transkriptindeki bir ders (V14). Eşleşmeyen dersler de burada durur; eşleştirme satırındaki karşı ders
 * bu listedeki sırasıyla (position) bu derse bağlanır.
 */
@Entity
@Table(name = "intibak_source_course")
public class IntibakSourceCourse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "record_id")
    private IntibakRecord record;

    @Column(nullable = false)
    private int position;

    @Column(length = 20)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    // Dersin ait olduğu yarıyıl; transkriptte yazıldığı gibi metin ("3", "2023-2024 Güz").
    @Column(length = 20)
    private String semester;

    @Column(precision = 4, scale = 1)
    private BigDecimal credit;

    @Column(precision = 4, scale = 1)
    private BigDecimal ects;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 2)
    private CourseLanguage language;

    @Column(length = 10)
    private String grade;

    protected IntibakSourceCourse() {
    }

    public IntibakSourceCourse(int position, String code, String name, String semester, BigDecimal credit,
            BigDecimal ects, CourseLanguage language, String grade) {
        this.position = position;
        this.code = code;
        this.name = name;
        this.semester = semester;
        this.credit = credit;
        this.ects = ects;
        this.language = language;
        this.grade = grade;
    }

    void attachTo(IntibakRecord record) {
        this.record = record;
    }

    public int getPosition() {
        return position;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getSemester() {
        return semester;
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
