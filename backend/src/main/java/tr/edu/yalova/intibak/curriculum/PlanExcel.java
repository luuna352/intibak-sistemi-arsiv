package tr.edu.yalova.intibak.curriculum;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import tr.edu.yalova.intibak.common.BadRequestException;

/**
 * Ders planı Excel şablonu: sabit 10 sütun. Yükleme bu sütunları okur; "Şablonu indir" ve "Excel'e aktar" aynı
 * sütunlarla dosya üretir. Böylece indirilen dosya düzeltilip tekrar yüklenebilir.
 * Toplam satırları dosyaya yazılmaz ve dosyadan okunmaz: toplamı sistem kendisi hesaplar (hoca orijinalle karşılaştırır).
 */
final class PlanExcel {

    // Sütun sırası ve başlıkları. Yüklenen dosyanın ilk satırı bunlarla aynı olmalı.
    static final List<String> HEADERS = List.of(
            "Yarıyıl", "Grup", "Kod", "Ders adı", "Z/S", "Dil", "T", "U", "Kredi", "AKTS");
    // Kötü niyetli ya da hatalı çok büyük dosyalara karşı üst sınır (bir planda ~150 ders olur).
    static final int MAX_ROWS = 1000;
    private static final Locale TR = Locale.forLanguageTag("tr");

    private PlanExcel() {
    }

    /** Okunan dersler ve her birinin Excel'deki satır numarası (hata mesajında "Excel 12. satır" demek için). */
    record ReadResult(List<CurriculumService.CourseInput> courses, List<Integer> excelRows) {
    }

    /** Excel'in ilk sayfasını okur: 1. satır başlık, sonrakiler ders. Tamamen boş satırlar atlanır. */
    static ReadResult read(InputStream in) {
        try (Workbook workbook = WorkbookFactory.create(in)) {
            Sheet sheet = workbook.getSheetAt(0);
            // DataFormatter hücreyi Excel'de göründüğü gibi metne çevirir; formül varsa sonucunu hesaplar.
            DataFormatter formatter = new DataFormatter(Locale.ROOT);
            FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator();

            checkHeader(sheet.getRow(0), formatter, evaluator);
            if (sheet.getLastRowNum() > MAX_ROWS) {
                throw new BadRequestException("Excel en fazla " + MAX_ROWS + " ders satırı içerebilir.");
            }

            List<CurriculumService.CourseInput> courses = new ArrayList<>();
            List<Integer> excelRows = new ArrayList<>();
            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                List<String> cells = texts(sheet.getRow(r), formatter, evaluator);
                if (cells.stream().allMatch(String::isEmpty)) {
                    continue;
                }
                // Kullanıcı Excel'de satır numarasını 1'den sayar; POI 0'dan sayar.
                String where = "Excel " + (r + 1) + ". satır: ";
                courses.add(new CurriculumService.CourseInput(
                        integer(cells.get(0), where + "Yarıyıl"),
                        cells.get(1),
                        cells.get(2),
                        cells.get(3),
                        compulsory(cells.get(4), where),
                        language(cells.get(5), where),
                        number(cells.get(6), where + "T"),
                        number(cells.get(7), where + "U"),
                        number(cells.get(8), where + "Kredi"),
                        number(cells.get(9), where + "AKTS")));
                excelRows.add(r + 1);
            }
            return new ReadResult(courses, excelRows);
        } catch (BadRequestException e) {
            throw e;
        } catch (IOException | RuntimeException e) {
            // Bozuk dosya, Excel olmayan dosya (PDF, resim ...) ya da şifreli dosya.
            throw new BadRequestException("Dosya okunamadı. Ders planı şablonuna uygun bir .xlsx dosyası yükleyin.");
        }
    }

    /** Dersleri şablon biçiminde .xlsx'e yazar. Boş liste verilirse boş şablon olur. */
    static byte[] write(List<PlanCourse> courses) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Ders planı");
            CellStyle bold = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            bold.setFont(font);

            Row header = sheet.createRow(0);
            for (int c = 0; c < HEADERS.size(); c++) {
                Cell cell = header.createCell(c);
                cell.setCellValue(HEADERS.get(c));
                cell.setCellStyle(bold);
            }
            for (int i = 0; i < courses.size(); i++) {
                PlanCourse course = courses.get(i);
                Row row = sheet.createRow(i + 1);
                setNumber(row, 0, course.getSemester() == null ? null : BigDecimal.valueOf(course.getSemester()));
                setText(row, 1, course.getGroupName());
                setText(row, 2, course.getCode());
                setText(row, 3, course.getName());
                setText(row, 4, course.isCompulsory() ? "Z" : "S");
                setText(row, 5, course.getLanguage().name());
                setNumber(row, 6, course.getTheoryHours());
                setNumber(row, 7, course.getPracticeHours());
                setNumber(row, 8, course.getCredit());
                setNumber(row, 9, course.getEcts());
            }
            // Sütun genişlikleri (birim: karakterin 1/256'sı): ders adı ve grup geniş, sayılar dar.
            int[] widths = {8, 26, 10, 45, 5, 5, 5, 5, 7, 7};
            for (int c = 0; c < widths.length; c++) {
                sheet.setColumnWidth(c, widths[c] * 256);
            }
            sheet.createFreezePane(0, 1);
            addHelpSheet(workbook);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Excel dosyası oluşturulamadı", e);
        }
    }

    // İkinci sayfa: şablonun nasıl doldurulacağı. Yükleme sadece ilk sayfayı okur.
    private static void addHelpSheet(Workbook workbook) {
        Sheet help = workbook.createSheet("Açıklama");
        String[] lines = {
            "Ders planı şablonu: sadece ilk sayfa okunur, ilk satırdaki başlıklar değiştirilmemelidir.",
            "Yarıyıl: 1-8. Seçmeli havuzu dersleri (örn. 5-6. yarıyıl teknik seçmeli listesi) için boş bırakılır.",
            "Grup: havuz dersleri için havuzun adı (örn. 5-6. yarıyıl teknik seçmeli). Yarıyıl dersleri için boş;"
                    + " 4. sınıfın iki ayrı programı varsa (örn. İME'ye gidenler / gitmeyenler) programın adı.",
            "Kod: dersin kodu (örn. BSM151). Kodu olmayan ders için boş bırakılabilir.",
            "Z/S: Z = zorunlu, S = seçmeli.",
            "Dil: TR ya da EN (İngilizce ders).",
            "T, U, Kredi, AKTS: sayı. Ondalık olabilir (örn. 3.5 ya da 3,5).",
            "Toplam satırı yazılmaz: sistem yarıyıl toplamlarını kendisi hesaplar, orijinal planla karşılaştırın.",
        };
        for (int i = 0; i < lines.length; i++) {
            help.createRow(i).createCell(0).setCellValue(lines[i]);
        }
        help.setColumnWidth(0, 120 * 256);
    }

    private static void checkHeader(Row row, DataFormatter formatter, FormulaEvaluator evaluator) {
        List<String> found = texts(row, formatter, evaluator);
        for (int c = 0; c < HEADERS.size(); c++) {
            if (!found.get(c).equalsIgnoreCase(HEADERS.get(c))) {
                throw new BadRequestException("Excel şablonu tanınmadı: ilk satırdaki başlıklar sırasıyla "
                        + String.join(", ", HEADERS) + " olmalı. Ekrandan boş şablonu indirip kullanın.");
            }
        }
    }

    // Satırın ilk 10 hücresini kırpılmış metin olarak verir; olmayan hücre boş metindir.
    private static List<String> texts(Row row, DataFormatter formatter, FormulaEvaluator evaluator) {
        List<String> values = new ArrayList<>();
        for (int c = 0; c < HEADERS.size(); c++) {
            Cell cell = row == null ? null : row.getCell(c);
            values.add(cell == null ? "" : formatter.formatCellValue(cell, evaluator).trim());
        }
        return values;
    }

    private static Integer integer(String text, String field) {
        if (text.isEmpty()) {
            return null;
        }
        try {
            return Integer.valueOf(text);
        } catch (NumberFormatException e) {
            throw new BadRequestException(field + " tam sayı olmalı (\"" + text + "\").");
        }
    }

    // "3,5" (Türkçe yazım) ve "3.5" ikisi de kabul edilir. Boş hücre = değer yok.
    private static BigDecimal number(String text, String field) {
        if (text.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(text.replace(',', '.'));
        } catch (NumberFormatException e) {
            throw new BadRequestException(field + " sayı olmalı (\"" + text + "\").");
        }
    }

    private static Boolean compulsory(String text, String where) {
        return switch (text.toUpperCase(TR)) {
            case "Z" -> true;
            case "S" -> false;
            case "" -> null;
            default -> throw new BadRequestException(where + "Z/S sütunu Z ya da S olmalı (\"" + text + "\").");
        };
    }

    private static CourseLanguage language(String text, String where) {
        return switch (text.toUpperCase(TR)) {
            case "TR" -> CourseLanguage.TR;
            case "EN" -> CourseLanguage.EN;
            case "" -> null;
            default -> throw new BadRequestException(where + "Dil sütunu TR ya da EN olmalı (\"" + text + "\").");
        };
    }

    private static void setText(Row row, int column, String value) {
        if (value != null) {
            row.createCell(column).setCellValue(value);
        }
    }

    private static void setNumber(Row row, int column, BigDecimal value) {
        if (value != null) {
            row.createCell(column).setCellValue(value.doubleValue());
        }
    }
}
