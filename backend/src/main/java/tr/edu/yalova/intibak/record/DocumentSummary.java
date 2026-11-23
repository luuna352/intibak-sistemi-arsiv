package tr.edu.yalova.intibak.record;

import java.time.Instant;

/** Bir belgenin dosyasız özeti: tür, dosya adı, boyut, yükleyenin adı (fiş mantığı) ve yükleme zamanı. */
public record DocumentSummary(DocumentKind kind, String fileName, long sizeBytes, String uploadedByName,
        Instant uploadedAt) {
}
