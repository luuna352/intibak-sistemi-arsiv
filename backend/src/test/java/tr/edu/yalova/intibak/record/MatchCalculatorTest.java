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
        // (Bu satırların adları farklı ve içerik yok; kural 5b uyarısı ayrı, burada sadece hazırlık şartına bakılır.)
        assertThat(MatchCalculator.evaluate(english, ROWS, PASSED, TR).warnings())
                .noneMatch(w -> w.contains("Hazırlık şartı"));
        assertThat(MatchCalculator.evaluate(turkish, ROWS, PrepStatus.NOT_TAKEN, TR).warnings())
                .noneMatch(w -> w.contains("Hazırlık şartı"));
    }

    private static MatchCalculator.CourseIn named(String name) {
        return new MatchCalculator.CourseIn(null, name, new BigDecimal("3"), null, CourseLanguage.TR, "92");
    }

    @Test
    void sameNameAndCommonCoursesAreDirectAcceptOthersGoToContent() {
        // Ad sadeleştirme: harf büyüklüğü, boşluk, noktalama ve sondaki Roma rakamı fark etmez.
        assertThat(MatchCalculator.normalizeName("  Veri   Yapıları ")).isEqualTo("veri yapıları");
        assertThat(MatchCalculator.normalizeName("FİZİK - II")).isEqualTo(MatchCalculator.normalizeName("fizik 2"));
        assertThat(MatchCalculator.normalizeName("Fizik I")).isEqualTo("fizik 1");
        assertThat(MatchCalculator.normalizeName("Fizik I")).isNotEqualTo(MatchCalculator.normalizeName("Fizik II"));

        // Kural 4: aynı ad (Türkçe büyük İ ile).
        assertThat(MatchCalculator.basis(new MatchCalculator.MatchIn(true, List.of(named("VERİ YAPILARI")),
                List.of(named("Veri Yapıları"))))).isEqualTo(MatchBasis.SAME_NAME);
        // Kural 3: Türk Dili / tarih dersi, ad farklı olsa da doğrudan kabul.
        assertThat(MatchCalculator.basis(new MatchCalculator.MatchIn(true, List.of(named("Türkçe I")),
                List.of(named("Türk Dili 1"))))).isEqualTo(MatchBasis.COMMON_COURSE);
        assertThat(MatchCalculator.basis(new MatchCalculator.MatchIn(true, List.of(named("Tarih")),
                List.of(named("Atatürk İlkeleri ve İnkılap Tarihi I"))))).isEqualTo(MatchBasis.COMMON_COURSE);
        // Kural 5: ad farklı (dil farkı da adı değiştirir) -> içerik karşılaştırması.
        assertThat(MatchCalculator.basis(new MatchCalculator.MatchIn(true, List.of(named("Data Structures")),
                List.of(named("Veri Yapıları"))))).isEqualTo(MatchBasis.CONTENT);
        // Birden çok Yalova dersi: hepsinin karşı tarafta aynı adlı dersi olmalı.
        assertThat(MatchCalculator.basis(new MatchCalculator.MatchIn(true,
                List.of(named("Fizik 1"), named("Fizik Lab")), List.of(named("Fizik I"), named("Fizik Lab")))))
                .isEqualTo(MatchBasis.SAME_NAME);
        assertThat(MatchCalculator.basis(new MatchCalculator.MatchIn(true, List.of(named("Fizik 1")),
                List.of(named("Fizik I"), named("Fizik Laboratuvarı"))))).isEqualTo(MatchBasis.CONTENT);
        // Bir taraf boşsa değerlendirme yok.
        assertThat(MatchCalculator.basis(new MatchCalculator.MatchIn(true, List.of(), List.of(named("X")))))
                .isNull();
    }

    @Test
    void contentPercentIsCoveredYalovaTopicsOverAll() {
        MatchCalculator.CourseIn yalovaWithTopics = new MatchCalculator.CourseIn("BSM201", "Veri Yapıları",
                new BigDecimal("4"), null, CourseLanguage.TR, null, List.of(
                        new MatchCalculator.Topic("Diziler", true),
                        new MatchCalculator.Topic("Bağlı listeler", true),
                        new MatchCalculator.Topic("Ağaçlar", false)));
        MatchCalculator.MatchIn match = new MatchCalculator.MatchIn(true, List.of(named("Data Structures")),
                List.of(yalovaWithTopics));

        // 2 / 3 = %66.7 -> 67. Yüzde öneriyi değiştirmez (eşik yok, kararı komisyon verir).
        MatchCalculator.MatchResult result = MatchCalculator.evaluate(match, ROWS, PASSED, TR);
        assertThat(result.contentPercent()).isEqualTo(67);
        assertThat(result.basis()).isEqualTo(MatchBasis.CONTENT);
        assertThat(result.suggestCounted()).isTrue();
        // Yalova konusu girilmemişse yüzde yok.
        assertThat(MatchCalculator.contentPercent(new MatchCalculator.MatchIn(true, List.of(named("X")),
                List.of(named("Y"))))).isNull();
    }

    @Test
    void differentNameWithoutYalovaContentIsNotSuggested() {
        // Kural 5b: ad farklı ve Yalova dersinin içeriği yok -> karşılaştırma yapılamaz, "sayılmaz" önerilir.
        MatchCalculator.MatchResult result = MatchCalculator.evaluate(new MatchCalculator.MatchIn(true,
                List.of(named("Data Structures")), List.of(named("Veri Yapıları"))), ROWS, PASSED, TR);
        assertThat(result.basis()).isEqualTo(MatchBasis.CONTENT);
        assertThat(result.warnings()).containsExactly(
                "Veri Yapıları: içeriği yok, isim benzerliği yok; içerik karşılaştırması yapılamaz.");
        assertThat(result.suggestCounted()).isFalse();
        // Eksik bilgi değil, kural önerisi: komisyon sayarsa kayıt engellenmez.
        assertThat(result.problems()).isEmpty();

        // Adı aynıysa içerik aranmaz: içeriği olmayan seçmeli ders de doğrudan kabul.
        MatchCalculator.MatchResult sameName = MatchCalculator.evaluate(new MatchCalculator.MatchIn(true,
                List.of(named("Oyun Programlama")), List.of(named("Oyun Programlama"))), ROWS, PASSED, TR);
        assertThat(sameName.warnings()).isEmpty();
        assertThat(sameName.suggestCounted()).isTrue();
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
