package tr.edu.yalova.intibak.record;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

/** Bir öğrencinin intibak kaydı (V5__create_intibak_record.sql). Durum değişiklikleri bu sınıfın metotlarıyla olur. */
@Entity
@Table(name = "intibak_record")
public class IntibakRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tc_no", nullable = false, length = 11)
    private String tcNo;

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(name = "transfer_type", nullable = false, length = 10)
    private TransferType transferType;

    @Column(length = 200)
    private String university;

    @Column(name = "faculty_department", length = 300)
    private String facultyDepartment;

    @Column(name = "registration_date")
    private LocalDate registrationDate;

    // Değerlendirmede kullanılan not dönüşüm tablosu (PT) ve Yalova ders planı. Sadece id tutulur; plan silinse de
    // eşleştirilen Yalova dersleri aşağıdaki satırlarda metin olarak durur.
    @Column(name = "grade_table_id")
    private Long gradeTableId;

    @Column(name = "plan_id")
    private Long planId;

    // Ders eşleştirme satırları; kayıtla birlikte kaydedilir, listeden çıkan satır silinir.
    @OneToMany(mappedBy = "record", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<IntibakMatch> matches = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RecordStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_before_cancel", length = 20)
    private RecordStatus statusBeforeCancel;

    @Column(name = "created_by_name", nullable = false, length = 200)
    private String createdByName;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_by_name", length = 200)
    private String updatedByName;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected IntibakRecord() {
    }

    /** Yeni kayıt "Oluşturuluyor" durumunda başlar. */
    public IntibakRecord(StudentInfo info, String createdByName, Instant createdAt) {
        apply(info);
        this.status = RecordStatus.OLUSTURULUYOR;
        this.createdByName = createdByName;
        this.createdAt = createdAt;
    }

    /** Öğrenci bilgileri; kayıt açarken ve değiştirirken aynı alanlar gelir. */
    public record StudentInfo(String tcNo, String fullName, TransferType transferType, String university,
            String facultyDepartment, LocalDate registrationDate) {
    }

    /** Bilgileri değiştirir; kayıt "Değiştiriliyor" durumuna geçer (Word'e aktarılmış olsa bile yeniden aktarılmalı). */
    public void update(StudentInfo info, String actorName, Instant now) {
        apply(info);
        this.status = RecordStatus.DEGISTIRILIYOR;
        touch(actorName, now);
    }

    /** "İptal et": kayıt silinmez, listede gizlenir. Önceki durum geri alma için saklanır. */
    public void cancel(String actorName, Instant now) {
        this.statusBeforeCancel = status;
        this.status = RecordStatus.IPTAL;
        touch(actorName, now);
    }

    /** "İptali geri al": kayıt iptalden önceki durumuna döner. */
    public void restore(String actorName, Instant now) {
        this.status = statusBeforeCancel;
        this.statusBeforeCancel = null;
        touch(actorName, now);
    }

    public boolean isCancelled() {
        return status == RecordStatus.IPTAL;
    }

    /** Eşleştirme tablosunu (PT, plan ve satırlar) ekrandaki haliyle değiştirir. */
    public void replaceMatches(Long gradeTableId, Long planId, List<IntibakMatch> newMatches) {
        this.gradeTableId = gradeTableId;
        this.planId = planId;
        matches.clear();
        for (IntibakMatch match : newMatches) {
            match.attachTo(this);
            matches.add(match);
        }
    }

    private void apply(StudentInfo info) {
        this.tcNo = info.tcNo();
        this.fullName = info.fullName();
        this.transferType = info.transferType();
        this.university = info.university();
        this.facultyDepartment = info.facultyDepartment();
        this.registrationDate = info.registrationDate();
    }

    private void touch(String actorName, Instant now) {
        this.updatedByName = actorName;
        this.updatedAt = now;
    }

    public Long getId() {
        return id;
    }

    public String getTcNo() {
        return tcNo;
    }

    public String getFullName() {
        return fullName;
    }

    public TransferType getTransferType() {
        return transferType;
    }

    public String getUniversity() {
        return university;
    }

    public String getFacultyDepartment() {
        return facultyDepartment;
    }

    public LocalDate getRegistrationDate() {
        return registrationDate;
    }

    public Long getGradeTableId() {
        return gradeTableId;
    }

    public Long getPlanId() {
        return planId;
    }

    public List<IntibakMatch> getMatches() {
        return matches;
    }

    public RecordStatus getStatus() {
        return status;
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
}
