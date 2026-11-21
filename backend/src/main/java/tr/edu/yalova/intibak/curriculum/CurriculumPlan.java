package tr.edu.yalova.intibak.curriculum;

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

/** Bir akademik yılın ders planı ve dersleri (V4__create_curriculum_plan.sql). */
@Entity
@Table(name = "curriculum_plan")
public class CurriculumPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Planın ilk yılı (2025 -> 2025-2026). Bir yıla tek plan düşer (UNIQUE).
    @Column(name = "start_year", nullable = false, unique = true)
    private int startYear;

    @Column(name = "source_file_name", length = 255)
    private String sourceFileName;

    @Column(name = "created_by_name", nullable = false, length = 200)
    private String createdByName;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_by_name", length = 200)
    private String updatedByName;

    @Column(name = "updated_at")
    private Instant updatedAt;

    // Dersler planla birlikte kaydedilir (cascade); listeden çıkarılan ders veritabanından da silinir
    // (orphanRemoval). Dersler her okunuşta Excel/ekran sırasıyla (position) gelir.
    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<PlanCourse> courses = new ArrayList<>();

    protected CurriculumPlan() {
    }

    public CurriculumPlan(int startYear, String createdByName, Instant createdAt) {
        this.startYear = startYear;
        this.createdByName = createdByName;
        this.createdAt = createdAt;
    }

    /** Derslerin tamamını yenileriyle değiştirir; değiştirenin adı ve zamanı yazılır. */
    public void replaceCourses(List<PlanCourse> newCourses, String updatedByName, Instant updatedAt) {
        courses.clear();
        for (PlanCourse course : newCourses) {
            course.attachTo(this);
            courses.add(course);
        }
        this.updatedByName = updatedByName;
        this.updatedAt = updatedAt;
    }

    /** Excel'den yüklendiğinde dosyanın adı bilgi olarak saklanır. */
    public void setSourceFileName(String sourceFileName) {
        this.sourceFileName = sourceFileName;
    }

    public Long getId() {
        return id;
    }

    public int getStartYear() {
        return startYear;
    }

    public String getSourceFileName() {
        return sourceFileName;
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

    public List<PlanCourse> getCourses() {
        return courses;
    }
}
