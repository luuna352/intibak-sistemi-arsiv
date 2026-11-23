package tr.edu.yalova.intibak.grade;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import tr.edu.yalova.intibak.user.UserService;

/** Ayarlar > Not tabloları. Giriş gerektirir (SecurityConfig: /api/** authenticated). */
@RestController
@RequestMapping("/api/grade-tables")
public class GradeTableController {

    private final GradeTableService service;
    private final UserService userService;

    public GradeTableController(GradeTableService service, UserService userService) {
        this.service = service;
        this.userService = userService;
    }

    /** Yeni tablo: adı ve karşı üniversitenin not sistemi (SCORE, LETTER_NUMBER, LETTER). */
    public record CreateRequest(String name, GradeSystem system) {
    }

    public record UpdateRequest(String name, List<GradeTableService.RowInput> rows) {
    }

    /** Yalova harf notu seçeneği ve puanı, örn. {"letter": "BA", "points": 3.50}. */
    public record YalovaGradeOption(YalovaGrade letter, BigDecimal points) {
    }

    @GetMapping
    public List<GradeTableService.Summary> list() {
        return service.list();
    }

    /** Ekrandaki "Yalova harf notu" açılır listesi; puanlar backend'de tek yerde (YalovaGrade) tanımlı. */
    @GetMapping("/yalova-grades")
    public List<YalovaGradeOption> yalovaGrades() {
        return Arrays.stream(YalovaGrade.values()).map(g -> new YalovaGradeOption(g, g.points())).toList();
    }

    @GetMapping("/{id}")
    public GradeTableService.Detail get(@PathVariable long id) {
        return service.get(id);
    }

    /** 201 Created: yeni tablo oluştu, cevapta tablonun kendisi (kodu PT4 ...) döner. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GradeTableService.Detail create(@RequestBody CreateRequest body, Authentication authentication) {
        return service.create(body.name(), body.system(), userService.displayNameOf(authentication));
    }

    @PutMapping("/{id}")
    public GradeTableService.Detail update(@PathVariable long id, @RequestBody UpdateRequest body,
            Authentication authentication) {
        return service.update(id, body.name(), body.rows(), userService.displayNameOf(authentication));
    }
}
