package tr.edu.yalova.intibak.curriculum;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import tr.edu.yalova.intibak.common.BadRequestException;
import tr.edu.yalova.intibak.user.UserService;

/** Ayarlar > Ders planları. Giriş gerektirir (SecurityConfig: /api/** authenticated). */
@RestController
@RequestMapping("/api/plans")
public class PlanController {

    // .xlsx dosyalarının resmi içerik türü; tarayıcı indirilen dosyayı Excel olarak tanır.
    private static final MediaType XLSX =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final CurriculumService service;
    private final UserService userService;

    public PlanController(CurriculumService service, UserService userService) {
        this.service = service;
        this.userService = userService;
    }

    public record UpdateRequest(List<CurriculumService.CourseInput> courses) {
    }

    @GetMapping
    public List<CurriculumService.Summary> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public CurriculumService.Detail get(@PathVariable long id) {
        return service.get(id);
    }

    @PutMapping("/{id}")
    public CurriculumService.Detail update(@PathVariable long id, @RequestBody UpdateRequest body,
            Authentication authentication) {
        return service.update(id, body.courses(), userService.displayNameOf(authentication));
    }

    /** Excel yükleme: form-data ile startYear (2025) ve file (.xlsx) gelir. */
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CurriculumService.Detail importExcel(@RequestParam int startYear, @RequestParam MultipartFile file,
            Authentication authentication) {
        if (file.isEmpty()) {
            throw new BadRequestException("Dosya seçilmedi ya da dosya boş.");
        }
        try (InputStream in = file.getInputStream()) {
            return service.importExcel(startYear, file.getOriginalFilename(), in,
                    userService.displayNameOf(authentication));
        } catch (IOException e) {
            throw new BadRequestException("Dosya okunamadı.");
        }
    }

    /** "Yıl için hangi plan kullanılır?": /api/plans/resolve?startYear=2027. */
    @GetMapping("/resolve")
    public CurriculumService.Resolution resolve(@RequestParam int startYear) {
        return service.resolve(startYear);
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> template() {
        return excel(service.template(), "ders-plani-sablonu.xlsx");
    }

    @GetMapping("/{id}/excel")
    public ResponseEntity<byte[]> exportExcel(@PathVariable long id) {
        CurriculumService.Detail plan = service.get(id);
        return excel(service.exportExcel(id), "ders-plani-" + plan.label() + ".xlsx");
    }

    // Cevabı indirilecek dosya olarak işaretler (Content-Disposition: attachment; filename=...).
    private static ResponseEntity<byte[]> excel(byte[] content, String fileName) {
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(fileName).build().toString())
                .body(content);
    }
}
