package tr.edu.yalova.intibak.record;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Eşleştirmedeki bir dersin bir konusu (V10__add_content_comparison.sql). covered sadece Yalova dersinin konularında
 * anlamlıdır: komisyon "bu konu karşı derste karşılanıyor" diye işaretler.
 */
@Entity
@Table(name = "intibak_match_topic")
public class IntibakMatchTopic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id")
    private IntibakMatchCourse course;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false, length = 500)
    private String text;

    @Column(nullable = false)
    private boolean covered;

    protected IntibakMatchTopic() {
    }

    public IntibakMatchTopic(int position, String text, boolean covered) {
        this.position = position;
        this.text = text;
        this.covered = covered;
    }

    void attachTo(IntibakMatchCourse course) {
        this.course = course;
    }

    public String getText() {
        return text;
    }

    public boolean isCovered() {
        return covered;
    }
}
