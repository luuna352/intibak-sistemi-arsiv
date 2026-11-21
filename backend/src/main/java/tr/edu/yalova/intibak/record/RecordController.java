package tr.edu.yalova.intibak.record;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import tr.edu.yalova.intibak.user.UserService;

/**
 * İntibak kayıtları. Giriş gerektirir (SecurityConfig: /api/** authenticated). Silme endpoint'i bilerek yok:
 * kayıt sadece iptal edilir ve geri alınabilir.
 */
@RestController
@RequestMapping("/api/records")
public class RecordController {

    private final RecordService service;
    private final UserService userService;

    public RecordController(RecordService service, UserService userService) {
        this.service = service;
        this.userService = userService;
    }

    /** /api/records?q=ayşe&includeCancelled=true */
    @GetMapping
    public List<RecordService.ListItem> list(@RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean includeCancelled) {
        return service.list(q, includeCancelled);
    }

    @GetMapping("/transfer-types")
    public List<RecordService.Option> transferTypes() {
        return service.transferTypes();
    }

    @GetMapping("/status-counts")
    public List<RecordService.StatusCount> statusCounts() {
        return service.statusCounts();
    }

    @GetMapping("/{id}")
    public RecordService.Detail get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RecordService.Detail create(@RequestBody RecordService.Input body, Authentication authentication) {
        return service.create(body, userService.displayNameOf(authentication));
    }

    @PutMapping("/{id}")
    public RecordService.Detail update(@PathVariable long id, @RequestBody RecordService.Input body,
            Authentication authentication) {
        return service.update(id, body, userService.displayNameOf(authentication));
    }

    @PostMapping("/{id}/cancel")
    public RecordService.Detail cancel(@PathVariable long id, Authentication authentication) {
        return service.cancel(id, userService.displayNameOf(authentication));
    }

    @PostMapping("/{id}/restore")
    public RecordService.Detail restore(@PathVariable long id, Authentication authentication) {
        return service.restore(id, userService.displayNameOf(authentication));
    }
}
