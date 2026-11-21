package tr.edu.yalova.intibak.curriculum;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import tr.edu.yalova.intibak.common.BadRequestException;

/** Excel şablonu: yazılan dosya geri okunabilmeli; yanlış dosya anlaşılır hatayla reddedilmeli. */
class PlanExcelTest {

    @Test
    void writtenPlanCanBeReadBack() {
        List<PlanCourse> courses = List.of(
                new PlanCourse(0, 1, null, "BSM151", "Algorithms and Programming 1", true, CourseLanguage.EN,
                        new BigDecimal("3"), new BigDecimal("2"), new BigDecimal("4"), new BigDecimal("7")),
                new PlanCourse(1, null, "5-6. yarıyıl teknik seçmeli", null, "Robotiğe Giriş", false,
                        CourseLanguage.TR, new BigDecimal("3"), BigDecimal.ZERO, new BigDecimal("3.5"),
                        new BigDecimal("6")));

        PlanExcel.ReadResult read = PlanExcel.read(new ByteArrayInputStream(PlanExcel.write(courses)));

        assertThat(read.courses()).hasSize(2);
        CurriculumService.CourseInput first = read.courses().get(0);
        assertThat(first.semester()).isEqualTo(1);
        assertThat(first.code()).isEqualTo("BSM151");
        assertThat(first.compulsory()).isTrue();
        assertThat(first.language()).isEqualTo(CourseLanguage.EN);
        CurriculumService.CourseInput second = read.courses().get(1);
        assertThat(second.semester()).isNull();
        assertThat(second.groupName()).isEqualTo("5-6. yarıyıl teknik seçmeli");
        assertThat(second.code()).isEmpty();
        assertThat(second.credit()).isEqualByComparingTo("3.5");
        // Excel satır numaraları: 1. satır başlık, dersler 2. satırdan başlar.
        assertThat(read.excelRows()).containsExactly(2, 3);
    }

    @Test
    void commaDecimalAndBlankRowsAreAccepted() throws IOException {
        byte[] file = workbook(new String[][] {
            PlanExcel.HEADERS.toArray(String[]::new),
            {"", "", "", "", "", "", "", "", "", ""},
            {"8", "", "MUH402", "Girişimcilik", "z", "tr", "3", "1", "3,5", "4"},
        });

        PlanExcel.ReadResult read = PlanExcel.read(new ByteArrayInputStream(file));

        assertThat(read.courses()).hasSize(1);
        assertThat(read.courses().get(0).credit()).isEqualByComparingTo("3.5");
        assertThat(read.excelRows()).containsExactly(3);
    }

    @Test
    void wrongHeaderIsRejected() throws IOException {
        byte[] file = workbook(new String[][] {{"Kod", "Ad"}});

        assertThatThrownBy(() -> PlanExcel.read(new ByteArrayInputStream(file)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("şablonu tanınmadı");
    }

    @Test
    void badCellNamesTheExcelRow() throws IOException {
        byte[] file = workbook(new String[][] {
            PlanExcel.HEADERS.toArray(String[]::new),
            {"1", "", "BSM151", "Programlama", "X", "TR", "3", "2", "4", "7"},
        });

        assertThatThrownBy(() -> PlanExcel.read(new ByteArrayInputStream(file)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Excel 2. satır")
                .hasMessageContaining("Z ya da S");
    }

    @Test
    void nonExcelFileIsRejected() {
        byte[] pdf = "%PDF-1.7 not an excel file".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> PlanExcel.read(new ByteArrayInputStream(pdf)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Dosya okunamadı");
    }

    // Testte elle Excel üretir: her hücre metin olarak yazılır (kullanıcının "3,5" yazması gibi).
    private static byte[] workbook(String[][] rows) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet();
            for (int r = 0; r < rows.length; r++) {
                Row row = sheet.createRow(r);
                for (int c = 0; c < rows[r].length; c++) {
                    row.createCell(c).setCellValue(rows[r][c]);
                }
            }
            workbook.write(out);
            return out.toByteArray();
        }
    }
}
