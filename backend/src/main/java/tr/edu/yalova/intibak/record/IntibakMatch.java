package tr.edu.yalova.intibak.record;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

/** Eşleştirme tablosunun bir satırı: karşı kurum ders(ler)i <-> Yalova ders(ler)i (V6__create_intibak_match.sql). */
@Entity
@Table(name = "intibak_match")
public class IntibakMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "record_id")
    private IntibakRecord record;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private boolean counted;

    // Satırın iki tarafındaki dersler tek listede; side alanı hangi tarafta olduğunu söyler.
    @OneToMany(mappedBy = "match", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<IntibakMatchCourse> courses = new ArrayList<>();

    protected IntibakMatch() {
    }

    public IntibakMatch(int position, boolean counted, List<IntibakMatchCourse> courses) {
        this.position = position;
        this.counted = counted;
        for (IntibakMatchCourse course : courses) {
            course.attachTo(this);
            this.courses.add(course);
        }
    }

    void attachTo(IntibakRecord record) {
        this.record = record;
    }

    public int getPosition() {
        return position;
    }

    public boolean isCounted() {
        return counted;
    }

    public List<IntibakMatchCourse> getCourses() {
        return courses;
    }

    /** Sadece bir taraftaki dersler (sıralı). */
    public List<IntibakMatchCourse> coursesOn(MatchSide side) {
        return courses.stream().filter(c -> c.getSide() == side).toList();
    }
}
