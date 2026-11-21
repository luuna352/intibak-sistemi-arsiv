package tr.edu.yalova.intibak.record;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

import tr.edu.yalova.intibak.curriculum.CourseLanguage;
import tr.edu.yalova.intibak.grade.GradeTableRow;
import tr.edu.yalova.intibak.grade.YalovaGrade;

/**
 * İntibak formunun hesapları (veritabanına dokunmaz, sadece hesaplar; bu yüzden kolay test edilir):
 * 1) Karşı kurum notunu seçilen PT tablosuyla Yalova harf notuna çevirir.
 * 2) Bir satırda birden çok karşı ders varsa (çoğa-bir) notları kredi ağırlıklı birleştirir.
 * 3) Satırın sayılmasına engel durumları bulur (eksik ders, tabloda olmayan not, başarısız not, dil farkı).
 * 4) Sayılan satırların Yalova kredisini toplar ve sınıf/dönemi bulur.
 * "Öğrenci lehine en yüksek karşılık" kuralı iki yerde uygulanır: puan iki aralığın arasında kalırsa üstteki aralık,
 * birleşik notun ortalaması iki harfin arasında kalırsa üstteki harf seçilir (komisyonca doğrulanacak).
 */
final class MatchCalculator {

    private static final Locale TR = Locale.forLanguageTag("tr");
    // Bu notlarla ders muaf sayılmaz (başarısız / devamsız).
    private static final Set<YalovaGrade> FAILING = Set.of(YalovaGrade.FD, YalovaGrade.FF, YalovaGrade.DZ);
    // Sınıf eşikleri (sayılan toplam kredi): < 30 -> 1. sınıf, 30-60 -> 2. sınıf, > 60 -> 3. sınıf.
    static final BigDecimal SECOND_CLASS_FROM = new BigDecimal("30");
    static final BigDecimal THIRD_CLASS_ABOVE = new BigDecimal("60");

    private MatchCalculator() {
    }

    /** Hesaba giren ders (karşı kurum ya da Yalova). Yalova dersinde grade boştur. */
    record CourseIn(String code, String name, BigDecimal credit, BigDecimal ects, CourseLanguage language,
            String grade) {
    }

    record MatchIn(boolean counted, List<CourseIn> incoming, List<CourseIn> yalova) {
    }

    /**
     * Bir satırın sonucu: her karşı dersin Yalova karşılığı (çevrilemediyse null), satırın birleşik notu,
     * satırdaki Yalova derslerinin kredi toplamı ve satırın sayılmasına engel olan sorunlar.
     */
    record MatchResult(List<YalovaGrade> incomingGrades, YalovaGrade grade, BigDecimal yalovaCredit,
            List<String> problems) {
    }

    /** Yerleşim: sayılan toplam kredi, sınıf (1-3), dönem (1, 3, 5) ve gerekçe metni. */
    record Placement(BigDecimal countedCredit, int classLevel, int semester, String reason) {
    }

    record Evaluation(List<MatchResult> matches, Placement placement) {
    }

    /** rows: seçilen PT tablosunun satırları; tablo seçilmediyse null. */
    static Evaluation evaluate(List<MatchIn> matches, List<GradeTableRow> rows, TransferType transferType) {
        List<MatchResult> results = new ArrayList<>();
        BigDecimal countedCredit = BigDecimal.ZERO;
        for (MatchIn match : matches) {
            MatchResult result = evaluate(match, rows);
            results.add(result);
            // Sorunlu satır, "sayıldı" işaretli olsa bile toplama girmez (kaydetmede de engellenir).
            if (match.counted() && result.problems().isEmpty()) {
                countedCredit = countedCredit.add(result.yalovaCredit());
            }
        }
        return new Evaluation(results, place(countedCredit, transferType));
    }

    static MatchResult evaluate(MatchIn match, List<GradeTableRow> rows) {
        List<String> problems = new ArrayList<>();
        if (match.incoming().isEmpty()) {
            problems.add("Karşı kurum dersi girilmedi.");
        }
        if (match.yalova().isEmpty()) {
            problems.add("Yalova dersi seçilmedi.");
        }
        if (rows == null) {
            problems.add("Not dönüşüm tablosu (PT) seçilmedi.");
        }

        List<YalovaGrade> grades = new ArrayList<>();
        for (CourseIn course : match.incoming()) {
            YalovaGrade converted = null;
            if (course.grade() == null || course.grade().isBlank()) {
                problems.add(course.name() + ": not girilmedi.");
            } else if (rows != null) {
                converted = convert(course.grade(), rows);
                if (converted == null) {
                    problems.add(course.name() + ": \"" + course.grade().trim() + "\" notu seçilen tabloda yok. Başka bir PT tablosu"
                            + " seçin; hiçbir tablo uymuyorsa dekanlığa/manuel incelemeye aktarılmalı.");
                }
            }
            grades.add(converted);
        }

        YalovaGrade grade = grades.isEmpty() || grades.contains(null) ? null : combine(match.incoming(), grades);
        if (grade != null && FAILING.contains(grade)) {
            problems.add("Başarısız not (" + grade + ") ile ders muaf sayılmaz.");
        }
        // İngilizce Yalova dersi, Türkçe verilmiş dersle karşılanamaz.
        boolean yalovaEnglish = match.yalova().stream().anyMatch(c -> c.language() == CourseLanguage.EN);
        boolean incomingTurkish = match.incoming().stream().anyMatch(c -> c.language() != CourseLanguage.EN);
        if (yalovaEnglish && incomingTurkish) {
            problems.add("Eğitim dili farklı: İngilizce Yalova dersi Türkçe dersle sayılmaz.");
        }

        BigDecimal yalovaCredit = match.yalova().stream()
                .map(CourseIn::credit).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new MatchResult(grades, grade, yalovaCredit, problems);
    }

    /**
     * Notu PT satırlarıyla Yalova harfine çevirir. Sayı ise ("85", "72,5") puan aralığına, değilse harf sütununa
     * bakılır (büyük/küçük harf farkı yok). Puan iki aralığın arasındaki boşluğa düşerse (örn. 89.5; 85-89 ile
     * 90-100 arası) öğrenci lehine üstteki aralık seçilir. Bulunamazsa null.
     */
    static YalovaGrade convert(String grade, List<GradeTableRow> rows) {
        String text = grade.trim();
        BigDecimal score = parse(text);
        if (score != null) {
            for (GradeTableRow row : rows) {
                if (row.getSourceMin() != null && score.compareTo(row.getSourceMin()) >= 0
                        && score.compareTo(row.getSourceMax()) <= 0) {
                    return row.getTargetLetter();
                }
            }
            // Boşluğa düşen puan: alt sınırı puandan büyük olan en yakın aralık (bir üst not).
            return rows.stream()
                    .filter(r -> r.getSourceMin() != null && r.getSourceMin().compareTo(score) > 0
                            && score.signum() >= 0)
                    .min(Comparator.comparing(GradeTableRow::getSourceMin))
                    .map(GradeTableRow::getTargetLetter)
                    .orElse(null);
        }
        String letter = text.toUpperCase(TR);
        return rows.stream()
                .filter(r -> r.getSourceLetter() != null && r.getSourceLetter().toUpperCase(TR).equals(letter))
                .map(GradeTableRow::getTargetLetter)
                .findFirst()
                .orElse(null);
    }

    /**
     * Satırdaki karşı derslerin notlarını birleştirir. Tek ders: kendi notu. Birden çok ders (çoğa-bir): Yalova
     * puanlarının kredi ağırlıklı ortalaması (kredi girilmemişse düz ortalama), ortalamaya eşit ya da ondan büyük
     * en düşük harfe yuvarlanır; yani iki harf arasında kalırsa üstteki (öğrenci lehine) harf verilir.
     */
    static YalovaGrade combine(List<CourseIn> incoming, List<YalovaGrade> grades) {
        if (grades.size() == 1) {
            return grades.get(0);
        }
        boolean allCredits = incoming.stream().allMatch(c -> c.credit() != null && c.credit().signum() > 0);
        BigDecimal weightedSum = BigDecimal.ZERO;
        BigDecimal totalWeight = BigDecimal.ZERO;
        for (int i = 0; i < grades.size(); i++) {
            BigDecimal weight = allCredits ? incoming.get(i).credit() : BigDecimal.ONE;
            weightedSum = weightedSum.add(grades.get(i).points().multiply(weight));
            totalWeight = totalWeight.add(weight);
        }
        BigDecimal average = weightedSum.divide(totalWeight, 4, RoundingMode.HALF_UP);
        YalovaGrade best = YalovaGrade.AA;
        for (YalovaGrade g : YalovaGrade.values()) {
            // DZ (devamsız) bir not seviyesi değil; yuvarlamada kullanılmaz.
            if (g != YalovaGrade.DZ && g.points().compareTo(average) >= 0
                    && g.points().compareTo(best.points()) < 0) {
                best = g;
            }
        }
        return best;
    }

    /**
     * Sınıf/dönem: DGS ile gelen öğrenci doğrudan 3. sınıf (5. dönem). Diğerlerinde sayılan Yalova kredisi
     * 30'dan az ise 1. sınıf (1. dönem), 30-60 arası (ikisi dahil) 2. sınıf (3. dönem), 60'tan fazla ise 3. sınıf
     * (5. dönem).
     */
    static Placement place(BigDecimal countedCredit, TransferType transferType) {
        String credit = countedCredit.stripTrailingZeros().toPlainString();
        if (transferType == TransferType.DGS) {
            return new Placement(countedCredit, 3, 5, "DGS ile gelen öğrenci 3. sınıfa (5. dönem) yerleşir.");
        }
        if (countedCredit.compareTo(SECOND_CLASS_FROM) < 0) {
            return new Placement(countedCredit, 1, 1, "Sayılan kredi " + credit + " < 30: 1. sınıf (1. dönem).");
        }
        if (countedCredit.compareTo(THIRD_CLASS_ABOVE) <= 0) {
            return new Placement(countedCredit, 2, 3, "Sayılan kredi " + credit + " (30-60): 2. sınıf (3. dönem).");
        }
        return new Placement(countedCredit, 3, 5, "Sayılan kredi " + credit + " > 60: 3. sınıf (5. dönem).");
    }

    // "85" / "72,5" / "72.5" -> sayı; harf notu ("BA", "A1") -> null.
    private static BigDecimal parse(String text) {
        try {
            return new BigDecimal(text.replace(',', '.'));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
