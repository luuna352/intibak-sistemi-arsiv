package tr.edu.yalova.intibak.record;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tr.edu.yalova.intibak.common.BadRequestException;
import tr.edu.yalova.intibak.common.NotFoundException;
import tr.edu.yalova.intibak.content.ContentDocument;

/**
 * İntibak kaydının belgeleri (V13): transkript ve ders içerik belgesi yükleme, indirme, değiştirme. Her kayıtta her
 * türden tek dosya olur. Dosyalar bu sistemin veritabanında kalır, dış servise gitmez (KVKK). Kayıtlar silinmediği
 * gibi belgeleri de silinmez; sadece aynı türden yenisi yüklenince eskisinin yerine geçer.
 */
@Service
public class RecordDocumentService {

    private static final Locale TR = Locale.forLanguageTag("tr");
    // Bir dosyanın en büyük boyutu: 50 sayfalık taranmış bir içerik PDF'i de sığsın (yazılı PDF genelde 1-5 MB).
    // application.properties'teki yükleme sınırıyla aynı tutulur.
    static final long MAX_BYTES = 30L * 1024 * 1024;

    private final IntibakRecordRepository records;
    private final IntibakDocumentRepository documents;
    private final Clock clock;

    public RecordDocumentService(IntibakRecordRepository records, IntibakDocumentRepository documents, Clock clock) {
        this.records = records;
        this.documents = documents;
        this.clock = clock;
    }

    /** Belgeler bölümünün durumu: içerikler transkriptte mi ve yüklenmiş belgelerin özetleri. */
    public record Documents(boolean contentInTranscript, List<DocumentSummary> documents) {
    }

    /** Belgedeki bölümler ("Belgede bul" için): hangi dosyadan okunduğu ve bölümler. */
    public record Sections(String fileName, List<ContentDocument.Section> sections) {
    }

    @Transactional(readOnly = true)
    public Documents list(long recordId) {
        IntibakRecord record = find(recordId);
        return new Documents(record.isContentInTranscript(), documents.summaries(recordId));
    }

    /**
     * Dosya yükler; aynı türden dosya varsa yerine geçer. Sadece PDF ve DOCX kabul edilir (uzantı ve dosyanın ilk
     * baytları birlikte kontrol edilir: adı .pdf olan ama PDF olmayan dosya reddedilir). İçerik belgesi yüklenirse
     * "içerikler transkriptte" işareti kalkar (artık içerik ayrı dosyada).
     */
    @Transactional
    public Documents upload(long recordId, DocumentKind kind, String fileName, byte[] data, String actorName) {
        IntibakRecord record = findEditable(recordId);
        if (kind == null) {
            throw new BadRequestException("Belge türü seçilmeli.");
        }
        String name = cleanName(fileName);
        String contentType = contentTypeOf(name, data);
        Instant now = Instant.now(clock);
        documents.findByRecordIdAndKind(recordId, kind).ifPresentOrElse(
                d -> d.replace(name, contentType, data, actorName, now),
                () -> documents.save(new IntibakDocument(recordId, kind, name, contentType, data, actorName, now)));
        if (kind == DocumentKind.CONTENT) {
            record.setContentInTranscript(false);
        }
        return list(recordId);
    }

    /**
     * "Ders içerikleri transkriptin içinde" kutusu. İşaretlenince ayrı içerik belgesi gereksizleşir ve kaldırılır
     * (aynı içerik iki yerde durmasın, "Belgede bul" hangi dosyaya bakacağını şaşırmasın).
     */
    @Transactional
    public Documents setContentInTranscript(long recordId, boolean value) {
        IntibakRecord record = findEditable(recordId);
        record.setContentInTranscript(value);
        if (value) {
            documents.findByRecordIdAndKind(recordId, DocumentKind.CONTENT).ifPresent(documents::delete);
        }
        return list(recordId);
    }

    /** İndirilecek dosya (bayt dahil). */
    @Transactional(readOnly = true)
    public IntibakDocument file(long recordId, DocumentKind kind) {
        find(recordId);
        return documents.findByRecordIdAndKind(recordId, kind)
                .orElseThrow(() -> new NotFoundException(kind.label() + " yüklenmemiş."));
    }

    /**
     * Öğrencinin ders içeriklerinin bölümleri: içerikler transkriptteyse transkriptten, değilse içerik belgesinden
     * okunur. Taranmış (resim) PDF'te yazı olmadığı için anlaşılır bir hata döner; o zaman içerik elle yazılır.
     */
    @Transactional(readOnly = true)
    public Sections sections(long recordId) {
        IntibakRecord record = find(recordId);
        DocumentKind source = record.isContentInTranscript() ? DocumentKind.TRANSCRIPT : DocumentKind.CONTENT;
        IntibakDocument doc = documents.findByRecordIdAndKind(recordId, source)
                .orElseThrow(() -> new NotFoundException(source.label() + " yüklenmemiş."));
        String text = ContentDocument.text(doc.getFileName(), doc.getData());
        return new Sections(doc.getFileName(), ContentDocument.sections(text, "Belgenin başı"));
    }

    // ---- Yardımcılar ----

    private IntibakRecord find(long recordId) {
        return records.findById(recordId).orElseThrow(() -> new NotFoundException("Kayıt bulunamadı."));
    }

    // İptal edilmiş kayda belge eklenmez (kaydın kendisi de değiştirilemiyor; önce iptal geri alınır).
    private IntibakRecord findEditable(long recordId) {
        IntibakRecord record = find(recordId);
        if (record.isCancelled()) {
            throw new BadRequestException("İptal edilmiş kayda belge yüklenemez. Önce iptali geri alın.");
        }
        return record;
    }

    // Dosya adı: klasör yolu atılır (bazı tarayıcılar tam yol gönderir), çok uzunsa sondan değil baştan kısaltılır
    // ki uzantı kalsın.
    static String cleanName(String fileName) {
        String name = fileName == null ? "" : fileName.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).trim();
        if (name.isEmpty()) {
            throw new BadRequestException("Dosya adı okunamadı.");
        }
        return name.length() > 255 ? name.substring(name.length() - 255) : name;
    }

    /** Uzantı ve dosyanın başındaki imza birbirini tutmalı: PDF "%PDF" ile, DOCX (zip) "PK" ile başlar. */
    static String contentTypeOf(String name, byte[] data) {
        if (data == null || data.length == 0) {
            throw new BadRequestException("Dosya boş.");
        }
        if (data.length > MAX_BYTES) {
            throw new BadRequestException("Dosya en fazla 30 MB olabilir.");
        }
        String lower = name.toLowerCase(TR);
        if (lower.endsWith(".pdf") && startsWith(data, "%PDF")) {
            return "application/pdf";
        }
        if (lower.endsWith(".docx") && startsWith(data, "PK")) {
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }
        if (lower.endsWith(".doc")) {
            throw new BadRequestException("Eski Word (.doc) dosyası yüklenemiyor. Word'de \"Farklı kaydet\" ile DOCX ya"
                    + " da PDF olarak kaydedip tekrar yükleyin.");
        }
        throw new BadRequestException("Sadece PDF ya da DOCX dosyası yüklenebilir (dosyanın içi uzantısıyla uyuşmalı).");
    }

    private static boolean startsWith(byte[] data, String prefix) {
        if (data.length < prefix.length()) {
            return false;
        }
        for (int i = 0; i < prefix.length(); i++) {
            if (data[i] != prefix.charAt(i)) {
                return false;
            }
        }
        return true;
    }
}
