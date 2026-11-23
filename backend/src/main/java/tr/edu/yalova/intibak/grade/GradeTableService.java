package tr.edu.yalova.intibak.grade;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tr.edu.yalova.intibak.common.BadRequestException;
import tr.edu.yalova.intibak.common.NotFoundException;

/**
 * Not dönüşüm tabloları (Ayarlar > Not tabloları): listeleme, yeni tablo (PT4, PT5 ...) açma, satırları kaydetme.
 * Satırlar kaydedilmeden önce kontrol edilir; hatalı bir tablo öğrencinin notunu yanlış çevireceği için kayda girmez.
 */
@Service
public class GradeTableService {

    private static final Pattern CODE = Pattern.compile("PT(\\d+)");
    private static final BigDecimal MIN_SCORE = BigDecimal.ZERO;
    private static final BigDecimal MAX_SCORE = new BigDecimal("100");

    private final GradeTableRepository repository;
    private final Clock clock;

    public GradeTableService(GradeTableRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    // ---- Ekrana giden ve ekrandan gelen veriler ----

    public record Summary(Long id, String code, String name, GradeSystem system, int rowCount) {
    }

    public record Row(String sourceLetter, BigDecimal sourceMin, BigDecimal sourceMax, YalovaGrade targetLetter,
            BigDecimal targetPoints) {
    }

    public record Detail(Long id, String code, String name, GradeSystem system, String description,
            String createdByName, Instant createdAt, String updatedByName, Instant updatedAt, List<Row> rows) {
    }

    /** Ekrandan gelen satır. Yalova puanı gelmez; harften hesaplanır. */
    public record RowInput(String sourceLetter, BigDecimal sourceMin, BigDecimal sourceMax, YalovaGrade targetLetter) {
    }

    // ---- İşlemler ----

    @Transactional(readOnly = true)
    public List<Summary> list() {
        return repository.findAllByOrderByIdAsc().stream()
                .map(t -> new Summary(t.getId(), t.getCode(), t.getName(), t.getSystem(), t.getRows().size()))
                .toList();
    }

    @Transactional(readOnly = true)
    public Detail get(long id) {
        return toDetail(find(id));
    }

    /**
     * "Yeni Puan Tablosu Ekle": sıradaki kodla (en büyük PT numarası + 1) boş bir tablo açar. Not sistemi (100'lük,
     * harf ve sayı, sadece harf) seçilmelidir; tablonun sütunları buna göre belirlenir.
     */
    @Transactional
    public Detail create(String name, GradeSystem system, String actorName) {
        String trimmed = requireName(name);
        if (system == null) {
            throw new BadRequestException("Not sistemi seçilmeli (100'lük puan, harf ve sayı ya da sadece harf).");
        }
        int next = repository.findAll().stream()
                .map(t -> CODE.matcher(t.getCode()))
                .filter(Matcher::matches)
                .mapToInt(m -> Integer.parseInt(m.group(1)))
                .max().orElse(0) + 1;
        GradeTable table = new GradeTable("PT" + next, trimmed, system, actorName, Instant.now(clock));
        return toDetail(repository.save(table));
    }

    /** Tablonun adını ve tüm satırlarını ekrandaki haliyle değiştirir. */
    @Transactional
    public Detail update(long id, String name, List<RowInput> inputs, String actorName) {
        GradeTable table = find(id);
        List<GradeTableRow> rows = validate(table.getSystem(), inputs);
        table.replace(requireName(name), rows, actorName, Instant.now(clock));
        return toDetail(table);
    }

    // ---- Kurallar ----

    /**
     * Satır kuralları (hata mesajı satır numarasıyla):
     * - Yalova harf notu seçilmeli.
     * - Karşı harf notu ya da puan aralığı (alt ve üst birlikte) olmalı; aralık 0-100 içinde ve alt <= üst.
     * - Aynı karşı harf notu iki kez yazılamaz; puan aralıkları üst üste binemez (bir puan iki farklı nota çevrilemez).
     * - Tablonun türüne göre (EK-1'deki sütunlar):
     *   100'lük puan: satır ya aralık (90-100) ya da özel not (DEVAMSIZ), ikisi birden değil;
     *   harf ve sayı: harf notu şart, sayı isteğe bağlı ve tek sayıdır (alt = üst, örn. 3.70);
     *   sadece harf: harf notu şart, sayı girilmez.
     */
    static List<GradeTableRow> validate(GradeSystem system, List<RowInput> inputs) {
        if (inputs == null || inputs.isEmpty()) {
            throw new BadRequestException("Tabloda en az bir satır olmalı.");
        }
        List<GradeTableRow> rows = new ArrayList<>();
        Set<String> letters = new HashSet<>();
        for (int i = 0; i < inputs.size(); i++) {
            RowInput in = inputs.get(i);
            String prefix = (i + 1) + ". satır: ";
            String letter = in.sourceLetter() == null || in.sourceLetter().isBlank() ? null : in.sourceLetter().trim();
            BigDecimal min = in.sourceMin();
            BigDecimal max = in.sourceMax();

            if (in.targetLetter() == null) {
                throw new BadRequestException(prefix + "Yalova harf notu seçilmeli.");
            }
            if ((min == null) != (max == null)) {
                throw new BadRequestException(prefix + "puan aralığının alt ve üst sınırı birlikte girilmeli.");
            }
            if (letter == null && min == null) {
                throw new BadRequestException(prefix + "karşı üniversite harf notu ya da puan aralığı girilmeli.");
            }
            if (min != null && (min.compareTo(MIN_SCORE) < 0 || max.compareTo(MAX_SCORE) > 0 || min.compareTo(max) > 0)) {
                throw new BadRequestException(prefix + "puan aralığı 0-100 arasında ve alt sınır üst sınırdan küçük olmalı.");
            }
            checkSystem(system, prefix, letter, min, max);
            if (letter != null && letter.length() > 10) {
                throw new BadRequestException(prefix + "harf notu en fazla 10 karakter olabilir.");
            }
            // Büyük/küçük harf farkı yok sayılır: "aa" ile "AA" aynı nottur. Türkçe "i/İ" için Locale.ROOT kullanılmaz.
            if (letter != null && !letters.add(letter.toUpperCase(Locale.forLanguageTag("tr")))) {
                throw new BadRequestException(prefix + "\"" + letter + "\" harf notu tabloda birden fazla kez var.");
            }
            rows.add(new GradeTableRow(i, letter, min, max, in.targetLetter()));
        }
        checkOverlaps(rows);
        return rows;
    }

    // Tablonun türüne göre satırda hangi sütunların dolu olabileceği (EK-1'deki tablolar gibi).
    private static void checkSystem(GradeSystem system, String prefix, String letter, BigDecimal min, BigDecimal max) {
        switch (system) {
            case SCORE -> {
                if (letter != null && min != null) {
                    throw new BadRequestException(prefix + "100'lü not ya puan aralığı (örn. 90-100) ya da özel not"
                            + " (örn. DEVAMSIZ) olmalı, ikisi birden olamaz.");
                }
            }
            case LETTER_NUMBER -> {
                if (letter == null) {
                    throw new BadRequestException(prefix + "karşı üniversitenin harf notu girilmeli.");
                }
                if (min != null && min.compareTo(max) != 0) {
                    throw new BadRequestException(prefix + "harf notunun sayı karşılığı tek bir sayı olmalı"
                            + " (örn. 3.70).");
                }
            }
            case LETTER -> {
                if (letter == null) {
                    throw new BadRequestException(prefix + "karşı üniversitenin harf notu girilmeli.");
                }
                if (min != null) {
                    throw new BadRequestException(prefix + "bu tabloda sadece harf notu olur, sayı girilmez.");
                }
            }
        }
    }

    // Aralıklar alt sınıra göre sıralanır; bir aralığın üstü sonrakinin altına eşit ya da büyükse çakışma vardır
    // (örn. 80-85 ve 85-89: 85 puan iki farklı nota çevrilirdi).
    private static void checkOverlaps(List<GradeTableRow> rows) {
        List<GradeTableRow> ranged = rows.stream()
                .filter(r -> r.getSourceMin() != null)
                .sorted(Comparator.comparing(GradeTableRow::getSourceMin))
                .toList();
        for (int i = 1; i < ranged.size(); i++) {
            GradeTableRow previous = ranged.get(i - 1);
            GradeTableRow current = ranged.get(i);
            if (previous.getSourceMax().compareTo(current.getSourceMin()) >= 0) {
                throw new BadRequestException("Puan aralıkları üst üste biniyor: "
                        + range(previous) + " ve " + range(current) + ".");
            }
        }
    }

    private static String range(GradeTableRow row) {
        return row.getSourceMin().stripTrailingZeros().toPlainString() + "-"
                + row.getSourceMax().stripTrailingZeros().toPlainString();
    }

    private static String requireName(String name) {
        String trimmed = name == null ? "" : name.trim();
        if (trimmed.isEmpty()) {
            throw new BadRequestException("Tablo adı boş olamaz.");
        }
        if (trimmed.length() > 200) {
            throw new BadRequestException("Tablo adı en fazla 200 karakter olabilir.");
        }
        return trimmed;
    }

    private GradeTable find(long id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Not tablosu bulunamadı."));
    }

    private static Detail toDetail(GradeTable t) {
        List<Row> rows = t.getRows().stream()
                .map(r -> new Row(r.getSourceLetter(), r.getSourceMin(), r.getSourceMax(), r.getTargetLetter(),
                        r.getTargetLetter().points()))
                .toList();
        return new Detail(t.getId(), t.getCode(), t.getName(), t.getSystem(), t.getDescription(),
                t.getCreatedByName(), t.getCreatedAt(), t.getUpdatedByName(), t.getUpdatedAt(), rows);
    }
}
