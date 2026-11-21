package tr.edu.yalova.intibak.common;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Uygulamanın saati. Service'ler "şu an"ı Instant.now(clock) ile alır; testlerde Clock.fixed(...) verilerek
 * tarihli alanlar (updated_at ...) sabit ve kontrol edilebilir olur.
 */
@Configuration
public class ClockConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
