package tr.edu.yalova.intibak.record;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

import static tr.edu.yalova.intibak.record.DepartmentLanguage.TR;
import static tr.edu.yalova.intibak.record.PrepStatus.PASSED;

import tr.edu.yalova.intibak.curriculum.CourseLanguage;
import tr.edu.yalova.intibak.grade.GradeTableRow;
import tr.edu.yalova.intibak.grade.YalovaGrade;

/** İntibak hesapları: not dönüşümü, öğrenci lehine yuvarlama, çoğa-bir, dil kuralı, sınıf/dönem eşikleri. */
class MatchCalculatorTest {

    // PT1'e benzer 100'lük tablo (85-89 ile 90-100 arasında 89.01-89.99 boşluğu var) + birkaç harf satırı.
    private static final List<GradeTableRow> ROWS = List.of(
            new GradeTableRow(0, null, new BigDecimal("90"), new BigDecimal("100"), YalovaGrade.AA),
            new GradeTableRow(1, null, new BigDecimal("85"), new BigDecimal("89"), YalovaGrade.BA),
            new GradeTableRow(2, null, new BigDecimal("75"), new BigDecimal("84"), YalovaGrade.BB),
            new GradeTableRow(3, null, new BigDecimal("0"), new BigDecimal("49"), YalovaGrade.FF),
            new GradeTableRow(4, "BB", null, null, YalovaGrade.BB),
            new GradeTableRow(5, "CB", null, null, YalovaGrade.CB));

    private static MatchCalculator.CourseIn incoming(String grade, String credit, CourseLanguage language) {
        return new MatchCalculator.CourseIn(null, "Ders " + grade, new BigDecimal(credit), null, language, grade);
    }

    private static MatchCalculator.CourseIn yalova(String credit, CourseLanguage language) {
        return new MatchCalculator.CourseIn("BSM101", "Yalova dersi", new BigDecimal(credit), null, language, null);
    }

    @Test
    void convertsScoresAndLetters() {
        assertThat(MatchCalculator.convert("92", ROWS)).isEqualTo(YalovaGrade.AA);
        assertThat(MatchCalculator.convert("85,0", ROWS)).isEqualTo(YalovaGrade.BA);
        assertThat(MatchCalculator.convert(" bb ", ROWS)).isEqualTo(YalovaGrade.BB);
        assertThat(MatchCalculator.convert("XY", ROWS)).isNull();
        assertThat(MatchCalculator.convert("101", ROWS)).isNull();
    }

    @Test
    void convertsEk1LetterSystemByLetterOrCoefficient() {
        // EK-1 harf sistemi (PT2'nin bir kısmı): karşı sayı alt = üst olarak tutulur, F0 devamsız -> DZ.
        List<GradeTableRow> pt2 = List.of(
                new GradeTableRow(0, "A", new BigDecimal("4.00"), new BigDecimal("4.00"), YalovaGrade.AA),
                new GradeTableRow(1, "A-", new BigDecimal("3.70"), new BigDecimal("3.70"), YalovaGrade.AA),
                new GradeTableRow(2, "B+", new BigDecimal("3.30"), new BigDecimal("3.30"), YalovaGrade.BA),
                new GradeTableRow(3, "F0", null, null, YalovaGrade.DZ));
        assertThat(MatchCalculator.convert("a-", pt2)).isEqualTo(YalovaGrade.AA);
        assertThat(MatchCalculator.convert("B+", pt2)).isEqualTo(YalovaGrade.BA);
        assertThat(MatchCalculator.convert("3,30", pt2)).isEqualTo(YalovaGrade.BA);
        // 3.5 iki sayının (3.30 ile 3.70) arasında: öğrenci lehine üstteki A- -> AA.
        assertThat(MatchCalculator.convert("3.5", pt2)).isEqualTo(YalovaGrade.AA);
        assertThat(MatchCalculator.convert("F0", pt2)).isEqualTo(YalovaGrade.DZ);
    }

    @Test
    void scoreInGapGetsTheHigherGradeForTheStudent() {
        // 89.5 hiçbir aralıkta değil: 85-89 (BA) ile 90-100 (AA) arasında; öğrenci lehine AA.
        assertThat(MatchCalculator.convert("89.5", ROWS)).isEqualTo(YalovaGrade.AA);
    }

    @Test
    void manyToOneUsesCreditWeightedAverageRoundedUp() {
        // AA (4.0, 3 kredi) + BB (3.0, 3 kredi) = 3.5 -> BA.
        MatchCalculator.MatchResult equal = MatchCalculator.evaluate(new MatchCalculator.MatchIn(true,
                List.of(incoming("92", "3", CourseLanguage.TR), incoming("BB", "3", CourseLanguage.TR)),
                List.of(yalova("5", CourseLanguage.TR))), ROWS, PASSED, TR);
        assertThat(equal.grade()).isEqualTo(YalovaGrade.BA);
        assertThat(equal.incomingGrades()).containsExactly(YalovaGrade.AA, YalovaGrade.BB);

        // BB (3.0) + CB (2.5), eşit kredi = 2.75: BB ile CB arasında, öğrenci lehine BB.
        MatchCalculator.MatchResult between = MatchCalculator.evaluate(new MatchCalculator.MatchIn(true,
                List.of(incoming("BB", "2", CourseLanguage.TR), incoming("CB", "2", CourseLanguage.TR)),
                List.of(yalova("4", CourseLanguage.TR))), ROWS, PASSED, TR);
        assertThat(between.grade()).isEqualTo(YalovaGrade.BB);
    }

    @Test
    void rulesOnlySuggestButMissingDataBlocks() {
        // Kural uyarıları (dil farkı, başarısız not): sistem "sayılmaz" önerir, eksik bilgi değildir.
        MatchCalculator.MatchResult language = MatchCalculator.evaluate(new MatchCalculator.MatchIn(true,
                List.of(incoming("92", "4", CourseLanguage.TR)), List.of(yalova("4", CourseLanguage.EN))), ROWS, PASSED, TR);
        assertThat(language.warnings()).anyMatch(p -> p.contains("Eğitim dili farklı"));
        assertThat(language.problems()).isEmpty();
        assertThat(language.suggestCounted()).isFalse();

        MatchCalculator.MatchResult failing = MatchCalculator.evaluate(new MatchCalculator.MatchIn(true,
                List.of(incoming("30", "4", CourseLanguage.TR)), List.of(yalova("4", CourseLanguage.TR))), ROWS, PASSED, TR);
        assertThat(failing.warnings()).anyMatch(p -> p.contains("Başarısız"));

        MatchCalculator.MatchResult noTable = MatchCalculator.evaluate(new MatchCalculator.MatchIn(true,
                List.of(incoming("92", "4", CourseLanguage.TR)), List.of(yalova("4", CourseLanguage.TR))), null, PASSED, TR);
        assertThat(noTable.problems()).anyMatch(p -> p.contains("PT"));

        MatchCalculator.MatchResult noGrade = MatchCalculator.evaluate(new MatchCalculator.MatchIn(true,
                List.of(incoming("", "4", CourseLanguage.TR)), List.of(yalova("4", CourseLanguage.TR))), ROWS, PASSED, TR);
        assertThat(noGrade.problems()).anyMatch(p -> p.contains("not girilmedi"));

        // Komisyon dil uyarılı satırı (4) bilerek saydı: krediye girer. Eksik bilgili satır (5) girmez,
        // sayılmayan satır (3) girmez.
        MatchCalculator.Evaluation evaluation = MatchCalculator.evaluate(List.of(
                new MatchCalculator.MatchIn(true, List.of(incoming("92", "4", CourseLanguage.TR)),
                        List.of(yalova("4", CourseLanguage.EN))),
                new MatchCalculator.MatchIn(true, List.of(incoming("92", "4", CourseLanguage.EN)),
                        List.of(yalova("6", CourseLanguage.EN))),
                new MatchCalculator.MatchIn(false, List.of(incoming("92", "4", CourseLanguage.TR)),
                        List.of(yalova("3", CourseLanguage.TR))),
                new MatchCalculator.MatchIn(true, List.of(incoming("XY", "4", CourseLanguage.TR)),
                        List.of(yalova("5", CourseLanguage.TR)))), ROWS, TransferType.YATAY, PASSED, TR);
        assertThat(evaluation.placement().countedCredit()).isEqualByComparingTo("10");
    }

    @Test
    void englishCourseNeedsPreparationOrEnglishDepartment() {
        // Kural 2b: hazırlığı geçmiş ya da bölümü en az %30 İngilizce ise şart tutar.
        assertThat(MatchCalculator.englishCondition(PASSED, TR)).isNull();
        assertThat(MatchCalculator.englishCondition(PrepStatus.NOT_TAKEN, DepartmentLanguage.EN30)).isNull();
        assertThat(MatchCalculator.englishCondition(PrepStatus.UNKNOWN, DepartmentLanguage.EN100)).isNull();
        // İkisi de yok: sayılmaz önerisi; bilgi eksikse bilgi istenir.
        assertThat(MatchCalculator.englishCondition(PrepStatus.NOT_TAKEN, TR)).contains("hazırlığı geçmemiş");
        assertThat(MatchCalculator.englishCondition(PrepStatus.UNKNOWN, TR)).contains("girilmeli");
        assertThat(MatchCalculator.englishCondition(PrepStatus.NOT_TAKEN, DepartmentLanguage.UNKNOWN))
                .contains("girilmeli");

        // Sadece karşı ders İngilizceyse aranır; Türkçe karşı derste uyarı yok.
        MatchCalculator.MatchIn english = new MatchCalculator.MatchIn(true,
                List.of(incoming("92", "4", CourseLanguage.EN)), List.of(yalova("4", CourseLanguage.TR)));
        MatchCalculator.MatchIn turkish = new MatchCalculator.MatchIn(true,
                List.of(incoming("92", "4", CourseLanguage.TR)), List.of(yalova("4", CourseLanguage.TR)));
        assertThat(MatchCalculator.evaluate(english, ROWS, PrepStatus.NOT_TAKEN, TR).warnings())
                .anyMatch(w -> w.contains("Hazırlık şartı"));
        assertThat(MatchCalculator.evaluate(english, ROWS, PASSED, TR).suggestCounted()).isTrue();
        assertThat(MatchCalculator.evaluate(turkish, ROWS, PrepStatus.NOT_TAKEN, TR).suggestCounted()).isTrue();
    }

    @Test
    void placementThresholds() {
        assertThat(MatchCalculator.place(new BigDecimal("29.5"), TransferType.YATAY).classLevel()).isEqualTo(1);
        assertThat(MatchCalculator.place(new BigDecimal("30"), TransferType.YATAY).semester()).isEqualTo(3);
        assertThat(MatchCalculator.place(new BigDecimal("60"), TransferType.YATAY).classLevel()).isEqualTo(2);
        assertThat(MatchCalculator.place(new BigDecimal("60.5"), TransferType.YATAY).semester()).isEqualTo(5);
        // DGS: kredi ne olursa olsun 3. sınıf (5. dönem).
        MatchCalculator.Placement dgs = MatchCalculator.place(BigDecimal.ZERO, TransferType.DGS);
        assertThat(dgs.classLevel()).isEqualTo(3);
        assertThat(dgs.semester()).isEqualTo(5);
    }
}
