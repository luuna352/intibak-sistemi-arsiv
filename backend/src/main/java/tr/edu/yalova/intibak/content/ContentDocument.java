package tr.edu.yalova.intibak.content;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;

import tr.edu.yalova.intibak.common.BadRequestException;

/**
 * Ders içerik belgesi (PDF ya da DOCX): yazıyı çıkarır ve ders başlıklarına göre bölümlere ayırır. Yapay zekâ ya da
 * internet kullanılmaz; her şey bu bilgisayarda, belgedeki yazıyla yapılır.
 * Başlık = ders koduyla başlayan satır ("BSM201 Veri Yapıları", "COME 103 - Programming") ya da "Dersin Kodu: BSM201"
 * gibi kod etiketi olan satır. Bir başlıktan sonraki satırlar, bir sonraki başlığa kadar o dersin içeriğidir.
 * Bölme belgeye göre yanılabilir; bu yüzden sonuç hep önizleme olarak gösterilir ve elle düzeltilebilir.
 */
public final class ContentDocument {

    private static final Locale TR = Locale.forLanguageTag("tr");
    // Ders kodu: 2-6 büyük harf, isteğe bağlı boşluk/tire, 3-4 rakam ve isteğe bağlı bir harf (BSM201, COME 103, İSG-102).
    private static final String CODE = "([A-ZÇĞİÖŞÜ]{2,6})[ \\t-]?(\\d{3,4}[A-Z]?)";
    private static final Pattern CODE_AT_START = Pattern.compile("^" + CODE + "(?![0-9])");
    private static final Pattern CODE_LABEL = Pattern.compile("(?i)ders(?:in)?\\s+kodu\\s*[:：]?\\s*" + CODE);
    // Bir bölümden en fazla bu kadar satır alınır (yanlış bölmede ekrana sayfalarca yazı gelmesin).
    static final int MAX_SECTION_LINES = 150;

    private ContentDocument() {
    }

    /** Belgenin bir bölümü: başlık satırı, bu başlıktaki ders kodu (sadeleşmiş, örn. "BSM201") ve içeriği. */
    public record Section(String heading, String code, String content) {
    }

    /**
     * Dosyadan yazı çıkarır. Sadece .pdf ve .docx; eski Word (.doc) okunamaz. Yazı yoksa (taranmış/resim PDF)
     * anlaşılır bir hata verir: o zaman içerik elle yapıştırılır.
     */
    public static String text(String fileName, byte[] bytes) {
        String name = fileName == null ? "" : fileName.toLowerCase(TR);
        String text;
        try {
            if (name.endsWith(".pdf")) {
                try (PDDocument pdf = Loader.loadPDF(bytes)) {
                    PDFTextStripper stripper = new PDFTextStripper();
                    // Yazılar sayfadaki yerine göre sıralanır (sütunlu sayfalarda satırlar karışmasın).
                    stripper.setSortByPosition(true);
                    text = stripper.getText(pdf);
                }
            } else if (name.endsWith(".docx")) {
                try (XWPFDocument docx = new XWPFDocument(new ByteArrayInputStream(bytes));
                        XWPFWordExtractor extractor = new XWPFWordExtractor(docx)) {
                    text = extractor.getText();
                }
            } else if (name.endsWith(".doc")) {
                throw new BadRequestException("Eski Word (.doc) dosyası okunamıyor. Word'de \"Farklı kaydet\" ile DOCX"
                        + " ya da PDF olarak kaydedip tekrar yükleyin.");
            } else {
                throw new BadRequestException("Sadece PDF ya da DOCX dosyası yüklenebilir.");
            }
        } catch (IOException | RuntimeException e) {
            if (e instanceof BadRequestException bad) {
                throw bad;
            }
            throw new BadRequestException("Dosya okunamadı (bozuk ya da şifreli olabilir).");
        }
        if (text == null || text.isBlank()) {
            throw new BadRequestException("Belgede yazı bulunamadı (taranmış/resim PDF olabilir). İçeriği elle"
                    + " yapıştırın.");
        }
        return text;
    }

    /**
     * Yazıyı ders başlıklarına göre bölümlere ayırır. Hiç başlık yoksa bütün yazı tek bölüm olur (başlığı
     * fallbackHeading). İçerik satırları kırpılır, boş satırlar atlanır (her satır bir konu).
     */
    public static List<Section> sections(String text, String fallbackHeading) {
        List<String> lines = text.lines().map(String::trim).filter(l -> !l.isEmpty()).toList();
        List<Section> sections = new ArrayList<>();
        String heading = null;
        String code = null;
        List<String> body = new ArrayList<>();
        for (String line : lines) {
            String lineCode = codeOf(line);
            if (lineCode != null) {
                if (heading != null || !body.isEmpty()) {
                    sections.add(section(heading, code, body, fallbackHeading));
                }
                heading = line;
                code = lineCode;
                body = new ArrayList<>();
            } else {
                body.add(line);
            }
        }
        if (heading != null || !body.isEmpty()) {
            sections.add(section(heading, code, body, fallbackHeading));
        }
        return sections;
    }

    /**
     * Bir ders kodunun bölümü. Aynı kod birden çok yerde geçebilir (örn. başta içindekiler listesi); en çok satırı
     * olan bölüm seçilir. Bulunamazsa null.
     */
    public static Section findByCode(List<Section> sections, String code) {
        String wanted = normalizeCode(code);
        if (wanted == null) {
            return null;
        }
        Section best = null;
        for (Section s : sections) {
            if (wanted.equals(s.code()) && (best == null || lineCount(s) > lineCount(best))) {
                best = s;
            }
        }
        return best == null || best.content().isEmpty() ? null : best;
    }

    /** "bsm 201" / "BSM-201" -> "BSM201"; ders kodu değilse (örn. "BSM4XX", boş) null. */
    public static String normalizeCode(String code) {
        if (code == null) {
            return null;
        }
        Matcher m = CODE_AT_START.matcher(code.trim().toUpperCase(TR));
        return m.find() && m.end() == code.trim().length() ? m.group(1) + m.group(2) : null;
    }

    // Satır bir ders başlığı mı? Kodla başlıyorsa ya da "Dersin Kodu: X" etiketi varsa sadeleşmiş kodu döner.
    private static String codeOf(String line) {
        Matcher start = CODE_AT_START.matcher(line);
        if (start.find()) {
            return start.group(1) + start.group(2);
        }
        Matcher label = CODE_LABEL.matcher(line);
        return label.find() ? label.group(1).toUpperCase(TR) + label.group(2) : null;
    }

    private static Section section(String heading, String code, List<String> body, String fallbackHeading) {
        List<String> kept = body.size() > MAX_SECTION_LINES ? body.subList(0, MAX_SECTION_LINES) : body;
        return new Section(heading == null ? fallbackHeading : heading, code, String.join("\n", kept));
    }

    private static int lineCount(Section s) {
        return s.content().isEmpty() ? 0 : (int) s.content().lines().count();
    }
}
