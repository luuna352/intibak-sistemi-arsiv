package tr.edu.yalova.intibak.record;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tr.edu.yalova.intibak.common.BadRequestException;
import tr.edu.yalova.intibak.common.NotFoundException;
import tr.edu.yalova.intibak.curriculum.CurriculumPlanRepository;
import tr.edu.yalova.intibak.grade.GradeTableRepository;

/** Kayıt belgeleri: dosya türü kontrolü, değiştirme, "içerikler transkriptte" ve aynı öğrencinin diğer kayıtları. */
class RecordDocumentServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-23T10:00:00Z");
    // Resmi algoritmayı geçen örnek numara (gerçek bir kişiye ait değil).
    private static final String VALID_TC = "10000000146";
    private static final byte[] PDF = "%PDF-1.7 deneme".getBytes(StandardCharsets.US_ASCII);

    private IntibakRecordRepository records;
    private IntibakDocumentRepository documents;
    private RecordDocumentService service;
    private IntibakRecord record;

    @BeforeEach
    void setUp() {
        records = mock(IntibakRecordRepository.class);
        documents = mock(IntibakDocumentRepository.class);
        service = new RecordDocumentService(records, documents, Clock.fixed(NOW, ZoneOffset.UTC));
        record = new IntibakRecord(RecordService.validate(input("Ankara Üniversitesi")), "Üye 1", NOW);
        when(records.findById(1L)).thenReturn(Optional.of(record));
        when(documents.summaries(1L)).thenReturn(List.of());
    }

    private static RecordService.Input input(String university) {
        return new RecordService.Input(VALID_TC, "Deneme Öğrenci", TransferType.YATAY, university, "",
                LocalDate.of(2026, 9, 15), null, null, null, null, List.of(), null, null, true);
    }

    @Test
    void onlyRealPdfOrDocxIsAccepted() {
        assertThat(RecordDocumentService.contentTypeOf("transkript.PDF", PDF)).isEqualTo("application/pdf");
        assertThat(RecordDocumentService.contentTypeOf("icerik.docx", "PK\u0003\u0004".getBytes(StandardCharsets.ISO_8859_1)))
                .contains("wordprocessingml");
        // Adı .pdf ama içi PDF değil.
        assertThatThrownBy(() -> RecordDocumentService.contentTypeOf("sahte.pdf", "merhaba".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> RecordDocumentService.contentTypeOf("eski.doc", PDF))
                .hasMessageContaining("Eski Word");
        assertThatThrownBy(() -> RecordDocumentService.contentTypeOf("resim.png", PDF))
                .hasMessageContaining("Sadece PDF ya da DOCX");
        assertThatThrownBy(() -> RecordDocumentService.contentTypeOf("buyuk.pdf",
                new byte[(int) RecordDocumentService.MAX_BYTES + 1])).hasMessageContaining("30 MB");
    }

    @Test
    void fileNameLosesFolderPath() {
        assertThat(RecordDocumentService.cleanName("C:\\Users\\x\\Belgeler\\transkript.pdf")).isEqualTo("transkript.pdf");
        assertThat(RecordDocumentService.cleanName("a/b/icerik.docx")).isEqualTo("icerik.docx");
        assertThatThrownBy(() -> RecordDocumentService.cleanName("  ")).isInstanceOf(BadRequestException.class);
    }

    @Test
    void firstUploadIsSavedWithUploaderName() {
        when(documents.findByRecordIdAndKind(1L, DocumentKind.TRANSCRIPT)).thenReturn(Optional.empty());

        service.upload(1L, DocumentKind.TRANSCRIPT, "transkript.pdf", PDF, "Dr. Deneme");

        verify(documents).save(any(IntibakDocument.class));
    }

    @Test
    void secondUploadReplacesTheOldFile() {
        IntibakDocument old = new IntibakDocument(1L, DocumentKind.TRANSCRIPT, "eski.pdf", "application/pdf", PDF,
                "Üye 1", NOW.minusSeconds(60));
        when(documents.findByRecordIdAndKind(1L, DocumentKind.TRANSCRIPT)).thenReturn(Optional.of(old));
        byte[] newer = "%PDF-1.7 yeni dosya".getBytes(StandardCharsets.US_ASCII);

        service.upload(1L, DocumentKind.TRANSCRIPT, "yeni.pdf", newer, "Üye 2");

        verify(documents, never()).save(any());
        assertThat(old.getFileName()).isEqualTo("yeni.pdf");
        assertThat(old.getSizeBytes()).isEqualTo(newer.length);
        assertThat(old.getUploadedByName()).isEqualTo("Üye 2");
        assertThat(old.getUploadedAt()).isEqualTo(NOW);
    }

    @Test
    void contentInTranscriptRemovesSeparateContentFileAndUploadingContentClearsIt() {
        IntibakDocument content = new IntibakDocument(1L, DocumentKind.CONTENT, "icerik.pdf", "application/pdf", PDF,
                "Üye 1", NOW);
        when(documents.findByRecordIdAndKind(1L, DocumentKind.CONTENT)).thenReturn(Optional.of(content));

        service.setContentInTranscript(1L, true);
        assertThat(record.isContentInTranscript()).isTrue();
        verify(documents).delete(content);

        when(documents.findByRecordIdAndKind(1L, DocumentKind.CONTENT)).thenReturn(Optional.empty());
        service.upload(1L, DocumentKind.CONTENT, "icerik.pdf", PDF, "Üye 1");
        assertThat(record.isContentInTranscript()).isFalse();
    }

    @Test
    void cancelledRecordTakesNoDocuments() {
        record.cancel("Üye 1", NOW);
        assertThatThrownBy(() -> service.upload(1L, DocumentKind.TRANSCRIPT, "t.pdf", PDF, "Üye 1"))
                .hasMessageContaining("İptal edilmiş");
    }

    @Test
    void sectionsComeFromTranscriptWhenContentIsInsideIt() throws IOException {
        record.setContentInTranscript(true);
        IntibakDocument transcript = new IntibakDocument(1L, DocumentKind.TRANSCRIPT, "transkript.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                docx("Transkript", "BİL101 Programlamaya Giriş", "Değişkenler", "Döngüler"), "Üye 1", NOW);
        when(documents.findByRecordIdAndKind(1L, DocumentKind.TRANSCRIPT)).thenReturn(Optional.of(transcript));

        RecordDocumentService.Sections sections = service.sections(1L);

        assertThat(sections.fileName()).isEqualTo("transkript.docx");
        assertThat(sections.sections()).anySatisfy(s -> {
            assertThat(s.code()).isEqualTo("BİL101");
            assertThat(s.content()).isEqualTo("Değişkenler\nDöngüler");
        });
    }

    @Test
    void missingContentDocumentIsReported() {
        when(documents.findByRecordIdAndKind(1L, DocumentKind.CONTENT)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.sections(1L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Ders içerik belgesi yüklenmemiş");
    }

    @Test
    void sameStudentListsOtherRecordsWithSameTc() {
        IntibakRecord first = new IntibakRecord(RecordService.validate(input("Birinci Üniversite")), "Üye 1", NOW);
        IntibakRecord second = new IntibakRecord(RecordService.validate(input("İkinci Üniversite")), "Üye 1", NOW);
        when(records.findByTcNoOrderByCreatedAtAsc(VALID_TC)).thenReturn(List.of(first, second));
        RecordService recordService = new RecordService(records, mock(GradeTableRepository.class),
                mock(CurriculumPlanRepository.class), Clock.fixed(NOW, ZoneOffset.UTC));

        assertThat(recordService.sameStudent("100 000 001 46", null))
                .extracting(RecordService.ListItem::university)
                .containsExactly("Birinci Üniversite", "İkinci Üniversite");
        // Geçersiz TC (yazılırken yarım numara): sorgu yapılmaz.
        assertThat(recordService.sameStudent("12345", null)).isEmpty();
    }

    // Testte kullanılacak küçük bir DOCX (her satır bir paragraf).
    private static byte[] docx(String... lines) throws IOException {
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            for (String line : lines) {
                doc.createParagraph().createRun().setText(line);
            }
            doc.write(out);
            return out.toByteArray();
        }
    }
}
