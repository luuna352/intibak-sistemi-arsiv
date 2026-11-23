package tr.edu.yalova.intibak.record;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** İntibak belgeleri. Liste sorgusu dosya baytlarını okumaz; dosya sadece indirilirken/okunurken yüklenir. */
public interface IntibakDocumentRepository extends JpaRepository<IntibakDocument, Long> {

    /** Kaydın belgelerinin dosyasız özetleri (ekranda ad, boyut, yükleyen, tarih). */
    @Query("select new tr.edu.yalova.intibak.record.DocumentSummary("
            + "d.kind, d.fileName, d.sizeBytes, d.uploadedByName, d.uploadedAt) "
            + "from IntibakDocument d where d.recordId = :recordId order by d.kind")
    List<DocumentSummary> summaries(@Param("recordId") Long recordId);

    Optional<IntibakDocument> findByRecordIdAndKind(Long recordId, DocumentKind kind);
}
