package tr.edu.yalova.intibak.system;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET /api/health: backend'in çalıştığını ve veritabanına bağlanabildiğini gösterir.
 * Frontend açılışta bu adresi çağırıp sonucu ekranda gösterir (iskeletin uçtan uca çalıştığının kanıtı).
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    // Spring, JdbcTemplate nesnesini constructor üzerinden verir (dependency injection).
    public HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public HealthResponse health() {
        // Veritabanına küçük bir sorgu gönderilir; bağlantı yoksa exception fırlar ve 500 döner.
        String version = jdbcTemplate.queryForObject("SHOW server_version", String.class);
        return new HealthResponse("UP", "PostgreSQL " + version);
    }

    /** JSON cevabı: {"status": "UP", "database": "PostgreSQL 17.x"} */
    public record HealthResponse(String status, String database) {
    }
}
