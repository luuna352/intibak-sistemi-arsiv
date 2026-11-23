package tr.edu.yalova.intibak.record;

import java.nio.charset.StandardCharsets;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import tr.edu.yalova.intibak.content.ContentDocumentController;
import tr.edu.yalova.intibak.user.UserService;

/**
 * Kaydın belgeleri: /api/records/{id}/documents. Giriş gerektirir (SecurityConfig: /api/**). Silme endpoint'i yok:
 * belge sadece aynı türden yenisiyle değiştirilir.
 */
@RestController
@RequestMapping("/api/records/{id}/documents")
public class RecordDocumentController {

    private final RecordDocumentService service;
    private final UserService userService;

    public RecordDocumentController(RecordDocumentService service, UserService userService) {
        this.service = service;
        this.userService = userService;
    }

    /** "İçerikler transkriptte" kutusu için gövde: {"value": true}. */
    public record Flag(Boolean value) {
    }

    @GetMapping
    public RecordDocumentService.Documents list(@PathVariable long id) {
        return service.list(id);
    }

    /** Dosya yükleme (form-data, alan adı "file"); kind: TRANSCRIPT ya da CONTENT. */
    @PutMapping(path = "/{kind}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RecordDocumentService.Documents upload(@PathVariable long id, @PathVariable DocumentKind kind,
            @RequestParam MultipartFile file, Authentication authentication) {
        return service.upload(id, kind, file.getOriginalFilename(), ContentDocumentController.bytes(file),
                userService.displayNameOf(authentication));
    }

    @PutMapping("/content-in-transcript")
    public RecordDocumentService.Documents contentInTranscript(@PathVariable long id, @RequestBody Flag body) {
        return service.setContentInTranscript(id, body != null && Boolean.TRUE.equals(body.value()));
    }

    /**
     * Dosyayı tarayıcıya gönderir. "inline": PDF tarayıcıda yeni sekmede açılır (DOCX indirilir). Dosya adı Türkçe
     * harf içerebileceği için UTF-8 ile yazılır.
     */
    @GetMapping("/{kind}/file")
    public ResponseEntity<byte[]> file(@PathVariable long id, @PathVariable DocumentKind kind) {
        IntibakDocument doc = service.file(id, kind);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(doc.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(doc.getFileName(), StandardCharsets.UTF_8).build().toString())
                .body(doc.getData());
    }

    /** "Belgede bul" için öğrencinin ders içeriklerinin bölümleri (içerik belgesinden ya da transkriptten). */
    @GetMapping("/sections")
    public RecordDocumentService.Sections sections(@PathVariable long id) {
        return service.sections(id);
    }
}
