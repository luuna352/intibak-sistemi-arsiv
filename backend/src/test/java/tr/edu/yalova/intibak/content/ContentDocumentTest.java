package tr.edu.yalova.intibak.content;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;

import tr.edu.yalova.intibak.common.BadRequestException;

/** Ders içerik belgesi: PDF/DOCX'ten yazı çıkarma ve ders başlıklarına göre bölme. */
class ContentDocumentTest {

    // Başta içindekiler listesi (kodlar art arda), sonra asıl bölümler; bir ders "Dersin Kodu:" etiketiyle başlıyor.
    private static final String CATALOG = """
            Bilgisayar Mühendisliği Ders İçerikleri
            BSM201 Veri Yapıları ........ 3
            BSM 202 Veri Tabanı ........ 4

            BSM201 - Veri Yapıları (3 0 3 5)
              Diziler ve bağlı listeler
            Yığın ve kuyruk

            Ağaçlar
            Dersin Kodu: bsm 202
            İlişkisel model
            SQL
            """;

    @Test
    void splitsByCourseHeadingsAndPicksTheLongestSection() {
        List<ContentDocument.Section> sections = ContentDocument.sections(CATALOG, "Belgenin başı");

        // Başlıktan önceki satır kendi bölümü olur; içindekiler satırları boş bölümlerdir.
        assertThat(sections.get(0).heading()).isEqualTo("Belgenin başı");
        assertThat(sections.get(0).code()).isNull();

        ContentDocument.Section dataStructures = ContentDocument.findByCode(sections, "BSM201");
        assertThat(dataStructures.heading()).isEqualTo("BSM201 - Veri Yapıları (3 0 3 5)");
        assertThat(dataStructures.content()).isEqualTo("Diziler ve bağlı listeler\nYığın ve kuyruk\nAğaçlar");
        // Plandaki kod boşluklu yazılmış olabilir; "Dersin Kodu:" etiketi de başlık sayılır.
        assertThat(ContentDocument.findByCode(sections, "BSM 202").content()).isEqualTo("İlişkisel model\nSQL");
        assertThat(ContentDocument.findByCode(sections, "MAT151")).isNull();
        assertThat(ContentDocument.findByCode(sections, "BSM4XX")).isNull();
    }

    @Test
    void normalizesCourseCodes() {
        assertThat(ContentDocument.normalizeCode(" bsm-201 ")).isEqualTo("BSM201");
        assertThat(ContentDocument.normalizeCode("İSG102")).isEqualTo("İSG102");
        assertThat(ContentDocument.normalizeCode("BSM4XX")).isNull();
        assertThat(ContentDocument.normalizeCode("BSM2015")).isEqualTo("BSM2015");
        assertThat(ContentDocument.normalizeCode(null)).isNull();
    }

    @Test
    void readsDocxAndPdf() throws Exception {
        XWPFDocument docx = new XWPFDocument();
        docx.createParagraph().createRun().setText("BSM201 Veri Yapıları");
        docx.createParagraph().createRun().setText("Ağaçlar");
        ByteArrayOutputStream docxBytes = new ByteArrayOutputStream();
        docx.write(docxBytes);
        docx.close();
        assertThat(ContentDocument.text("icerik.DOCX", docxBytes.toByteArray())).contains("Veri Yapıları", "Ağaçlar");

        // PDF'in standart yazı tipi Türkçe harf içermez; testte ASCII yazı kullanılır.
        ByteArrayOutputStream pdfBytes = new ByteArrayOutputStream();
        try (PDDocument pdf = new PDDocument()) {
            PDPage page = new PDPage();
            pdf.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(pdf, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                stream.showText("COME103 Programming");
                stream.newLineAtOffset(0, -20);
                stream.showText("Loops and arrays");
                stream.endText();
            }
            pdf.save(pdfBytes);
        }
        String text = ContentDocument.text("catalog.pdf", pdfBytes.toByteArray());
        assertThat(ContentDocument.findByCode(ContentDocument.sections(text, "x"), "COME 103").content())
                .isEqualTo("Loops and arrays");
    }

    @Test
    void rejectsUnsupportedOrUnreadableFiles() {
        assertThatThrownBy(() -> ContentDocument.text("eski.doc", new byte[] {1, 2}))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("DOCX");
        assertThatThrownBy(() -> ContentDocument.text("resim.png", new byte[] {1, 2}))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("PDF ya da DOCX");
        assertThatThrownBy(() -> ContentDocument.text("bozuk.pdf", new byte[] {1, 2, 3}))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("okunamadı");
    }
}
