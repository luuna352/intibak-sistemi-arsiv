package tr.edu.yalova.intibak.record;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * İntibak kaydının bir belgesi (V13__create_intibak_document.sql): transkript ya da ders içerik belgesi, dosyanın
 * kendisiyle birlikte. Kayda sadece id ile bağlıdır (ilişki nesnesi yok): kayıt açılırken dosyalar (MB'larca bayt)
 * boşuna yüklenmesin; listeleme ayrıca baytsız özet sorgusuyla yapılır (IntibakDocumentRepository).
 */
@Entity
@Table(name = "intibak_document")
public class IntibakDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_id", nullable = false)
    private Long recordId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DocumentKind kind;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(nullable = false)
    private byte[] data;

    @Column(name = "uploaded_by_name", nullable = false, length = 200)
    private String uploadedByName;

    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt;

    protected IntibakDocument() {
    }

    public IntibakDocument(Long recordId, DocumentKind kind, String fileName, String contentType, byte[] data,
            String uploadedByName, Instant uploadedAt) {
        this.recordId = recordId;
        this.kind = kind;
        replace(fileName, contentType, data, uploadedByName, uploadedAt);
    }

    /** Aynı türden yeni dosya yüklendi: eskisinin yerine geçer (her kayıtta her türden tek belge). */
    public void replace(String fileName, String contentType, byte[] data, String uploadedByName, Instant uploadedAt) {
        this.fileName = fileName;
        this.contentType = contentType;
        this.data = data;
        this.sizeBytes = data.length;
        this.uploadedByName = uploadedByName;
        this.uploadedAt = uploadedAt;
    }

    public Long getId() {
        return id;
    }

    public Long getRecordId() {
        return recordId;
    }

    public DocumentKind getKind() {
        return kind;
    }

    public String getFileName() {
        return fileName;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public byte[] getData() {
        return data;
    }

    public String getUploadedByName() {
        return uploadedByName;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }
}
