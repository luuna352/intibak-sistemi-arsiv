package tr.edu.yalova.intibak.record;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tr.edu.yalova.intibak.common.BadRequestException;
import tr.edu.yalova.intibak.common.NotFoundException;

/**
 * İntibak kayıtları: listeleme/arama, kayıt açma, değiştirme, iptal ve iptali geri alma. Kayıt hiçbir zaman fiziksel
 * olarak silinmez. Her işlemde yapanın o anki görünen adı kayda metin olarak yazılır ("fatura mantığı").
 */
@Service
public class RecordService {

    private static final Locale TR = Locale.forLanguageTag("tr");

    private final IntibakRecordRepository repository;
    private final Clock clock;

    public RecordService(IntibakRecordRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    // ---- Ekrana giden ve ekrandan gelen veriler ----

    /** Liste satırı. TC gizlenmiş gelir (123•••••901); tamamı sadece kaydın içinde görünür. */
    public record ListItem(Long id, String tcMasked, String fullName, TransferType transferType,
            String transferTypeLabel, String university, String createdByName, Instant createdAt,
            String updatedByName, Instant updatedAt, RecordStatus status, String statusLabel) {
    }

    public record Detail(Long id, String tcNo, String fullName, TransferType transferType, String transferTypeLabel,
            String university, String facultyDepartment, LocalDate registrationDate, RecordStatus status,
            String statusLabel, String createdByName, Instant createdAt, String updatedByName, Instant updatedAt) {
    }

    /** Formdan gelen öğrenci bilgileri. */
    public record Input(String tcNo, String fullName, TransferType transferType, String university,
            String facultyDepartment, LocalDate registrationDate) {
    }

    /** Açılır liste seçeneği: {"value": "YATAY", "label": "Yatay geçiş"}. */
    public record Option(String value, String label) {
    }

    /** Kayıt durumları ekranı: her durumdan kaç kayıt var. */
    public record StatusCount(RecordStatus status, String label, long count) {
    }

    // ---- İşlemler ----

    /**
     * Liste. query boş değilse TC'de ya da ad-soyadda geçen kayıtlar (büyük/küçük harf farkı yok); iptal edilenler
     * sadece includeCancelled=true ise gelir.
     */
    @Transactional(readOnly = true)
    public List<ListItem> list(String query, boolean includeCancelled) {
        List<IntibakRecord> records = includeCancelled
                ? repository.findAllByOrderByCreatedAtDesc()
                : repository.findByStatusNotOrderByCreatedAtDesc(RecordStatus.IPTAL);
        String q = query == null ? "" : query.trim().toLowerCase(TR);
        return records.stream()
                .filter(r -> q.isEmpty() || r.getTcNo().contains(q) || r.getFullName().toLowerCase(TR).contains(q))
                .map(RecordService::toListItem)
                .toList();
    }

    @Transactional(readOnly = true)
    public Detail get(long id) {
        return toDetail(find(id));
    }

    @Transactional
    public Detail create(Input input, String actorName) {
        IntibakRecord record = new IntibakRecord(validate(input), actorName, Instant.now(clock));
        return toDetail(repository.save(record));
    }

    @Transactional
    public Detail update(long id, Input input, String actorName) {
        IntibakRecord record = find(id);
        if (record.isCancelled()) {
            throw new BadRequestException("İptal edilmiş kayıt değiştirilemez. Önce iptali geri alın.");
        }
        record.update(validate(input), actorName, Instant.now(clock));
        return toDetail(record);
    }

    @Transactional
    public Detail cancel(long id, String actorName) {
        IntibakRecord record = find(id);
        if (record.isCancelled()) {
            throw new BadRequestException("Kayıt zaten iptal edilmiş.");
        }
        record.cancel(actorName, Instant.now(clock));
        return toDetail(record);
    }

    @Transactional
    public Detail restore(long id, String actorName) {
        IntibakRecord record = find(id);
        if (!record.isCancelled()) {
            throw new BadRequestException("Kayıt iptal edilmemiş.");
        }
        record.restore(actorName, Instant.now(clock));
        return toDetail(record);
    }

    /** Her durumdan kaç kayıt var (sayısı 0 olan durumlar da listelenir). */
    @Transactional(readOnly = true)
    public List<StatusCount> statusCounts() {
        Map<RecordStatus, Long> counts = repository.findAll().stream()
                .collect(Collectors.groupingBy(IntibakRecord::getStatus, Collectors.counting()));
        return Arrays.stream(RecordStatus.values())
                .map(s -> new StatusCount(s, s.label(), counts.getOrDefault(s, 0L)))
                .toList();
    }

    public List<Option> transferTypes() {
        return Arrays.stream(TransferType.values()).map(t -> new Option(t.name(), t.label())).toList();
    }

    // ---- Kurallar ----

    /** TC (resmi algoritmayla), ad-soyad ve geçiş türü zorunlu; metinler kırpılır, boş metin = değer yok. */
    static IntibakRecord.StudentInfo validate(Input in) {
        if (in == null) {
            throw new BadRequestException("Kayıt bilgileri gelmedi.");
        }
        String tc = in.tcNo() == null ? "" : in.tcNo().replace(" ", "");
        if (!TcNo.isValid(tc)) {
            throw new BadRequestException("TC Kimlik No geçersiz (11 hane, resmi kontrol hanesi tutmalı).");
        }
        String fullName = text(in.fullName(), 200, "Ad-soyad");
        if (fullName == null) {
            throw new BadRequestException("Ad-soyad girilmeli.");
        }
        if (in.transferType() == null) {
            throw new BadRequestException("Geçiş türü seçilmeli.");
        }
        return new IntibakRecord.StudentInfo(tc, fullName, in.transferType(),
                text(in.university(), 200, "Geldiği üniversite"),
                text(in.facultyDepartment(), 300, "Fakülte / bölüm"),
                in.registrationDate());
    }

    private static String text(String value, int max, String field) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() > max) {
            throw new BadRequestException(field + " en fazla " + max + " karakter olabilir.");
        }
        return trimmed;
    }

    private IntibakRecord find(long id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Kayıt bulunamadı."));
    }

    private static ListItem toListItem(IntibakRecord r) {
        return new ListItem(r.getId(), TcNo.mask(r.getTcNo()), r.getFullName(), r.getTransferType(),
                r.getTransferType().label(), r.getUniversity(), r.getCreatedByName(), r.getCreatedAt(),
                r.getUpdatedByName(), r.getUpdatedAt(), r.getStatus(), r.getStatus().label());
    }

    private static Detail toDetail(IntibakRecord r) {
        return new Detail(r.getId(), r.getTcNo(), r.getFullName(), r.getTransferType(), r.getTransferType().label(),
                r.getUniversity(), r.getFacultyDepartment(), r.getRegistrationDate(), r.getStatus(),
                r.getStatus().label(), r.getCreatedByName(), r.getCreatedAt(), r.getUpdatedByName(),
                r.getUpdatedAt());
    }
}
