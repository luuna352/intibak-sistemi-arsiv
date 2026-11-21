package tr.edu.yalova.intibak.grade;

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

/** Not tablosunun bir satırı: karşı harf notu ve/veya puan aralığı -> Yalova harf notu. */
@Entity
@Table(name = "grade_table_row")
public class GradeTableRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Satırın ait olduğu tablo. LAZY: satır okunurken tablo ayrıca yüklenmez, gerekirse yüklenir.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "grade_table_id")
    private GradeTable gradeTable;

    @Column(nullable = false)
    private int position;

    @Column(name = "source_letter", length = 10)
    private String sourceLetter;

    // NUMERIC(5,2): 100.00'e kadar, virgülden sonra 2 hane. BigDecimal ondalık sayıyı yuvarlamadan tutar.
    @Column(name = "source_min", precision = 5, scale = 2)
    private BigDecimal sourceMin;

    @Column(name = "source_max", precision = 5, scale = 2)
    private BigDecimal sourceMax;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_letter", nullable = false, length = 2)
    private YalovaGrade targetLetter;

    protected GradeTableRow() {
    }

    public GradeTableRow(int position, String sourceLetter, BigDecimal sourceMin, BigDecimal sourceMax,
            YalovaGrade targetLetter) {
        this.position = position;
        this.sourceLetter = sourceLetter;
        this.sourceMin = sourceMin;
        this.sourceMax = sourceMax;
        this.targetLetter = targetLetter;
    }

    void attachTo(GradeTable table) {
        this.gradeTable = table;
    }

    public int getPosition() {
        return position;
    }

    public String getSourceLetter() {
        return sourceLetter;
    }

    public BigDecimal getSourceMin() {
        return sourceMin;
    }

    public BigDecimal getSourceMax() {
        return sourceMax;
    }

    public YalovaGrade getTargetLetter() {
        return targetLetter;
    }
}
