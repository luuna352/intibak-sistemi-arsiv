package tr.edu.yalova.intibak.content;

import java.io.IOException;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import tr.edu.yalova.intibak.common.BadRequestException;

/**
 * Öğrencinin ders içerik belgesi (A3): yüklenen PDF/DOCX bölümlere ayrılıp ekrana döner. Dosya ve yazı sunucuda
 * saklanmaz; komisyonun seçtiği konular kayda kopyalanır (V10). Giriş gerektirir (SecurityConfig: /api/**).
 */
@RestController
@RequestMapping("/api/content-documents")
public class ContentDocumentController {

    /** Belgenin bölümleri: her biri bir ders başlığı ve altındaki satırlar. */
    public record Result(String fileName, List<ContentDocument.Section> sections) {
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result read(@RequestParam MultipartFile file) {
        return new Result(file.getOriginalFilename(), ContentDocument.sections(
                ContentDocument.text(file.getOriginalFilename(), bytes(file)), "Belgenin başı"));
    }

    /** Yüklenen dosyanın baytları; boş dosya kabul edilmez. */
    public static byte[] bytes(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("Dosya seçilmedi ya da dosya boş.");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new BadRequestException("Dosya okunamadı.");
        }
    }
}
