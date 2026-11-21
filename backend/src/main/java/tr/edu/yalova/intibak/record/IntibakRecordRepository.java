package tr.edu.yalova.intibak.record;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/** İntibak kaydı sorguları. Metot adları Spring Data tarafından SQL'e çevrilir. */
public interface IntibakRecordRepository extends JpaRepository<IntibakRecord, Long> {

    /** Varsayılan liste: iptal edilmemiş kayıtlar, en yenisi üstte. */
    List<IntibakRecord> findByStatusNotOrderByCreatedAtDesc(RecordStatus status);

    /** "İptal edilenleri göster" işaretliyse: tüm kayıtlar, en yenisi üstte. */
    List<IntibakRecord> findAllByOrderByCreatedAtDesc();
}
