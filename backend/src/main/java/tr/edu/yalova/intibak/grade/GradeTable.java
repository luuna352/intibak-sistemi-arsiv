package tr.edu.yalova.intibak.grade;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

/** Bir not dönüşüm tablosu (PT1, PT2 ...) ve satırları (V3__create_grade_table.sql). */
@Entity
@Table(name = "grade_table")
public class GradeTable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 10)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "created_by_name", nullable = false, length = 200)
    private String createdByName;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_by_name", length = 200)
    private String updatedByName;

    @Column(name = "updated_at")
    private Instant updatedAt;

    // Satırlar tabloyla birlikte kaydedilir (cascade); listeden çıkarılan satır veritabanından da silinir
    // (orphanRemoval). Satırlar her okunuşta position sırasıyla gelir.
    @OneToMany(mappedBy = "gradeTable", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<GradeTableRow> rows = new ArrayList<>();

    protected GradeTable() {
    }

    public GradeTable(String code, String name, String createdByName, Instant createdAt) {
        this.code = code;
        this.name = name;
        this.createdByName = createdByName;
        this.createdAt = createdAt;
    }

    /** Adı ve satırları baştan yazar; kimin, ne zaman değiştirdiği ad metni olarak saklanır. */
    public void replace(String name, List<GradeTableRow> newRows, String updatedByName, Instant updatedAt) {
        this.name = name;
        rows.clear();
        for (GradeTableRow row : newRows) {
            row.attachTo(this);
            rows.add(row);
        }
        this.updatedByName = updatedByName;
        this.updatedAt = updatedAt;
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getCreatedByName() {
        return createdByName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getUpdatedByName() {
        return updatedByName;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public List<GradeTableRow> getRows() {
        return rows;
    }
}
