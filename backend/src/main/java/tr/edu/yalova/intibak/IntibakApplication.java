package tr.edu.yalova.intibak;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Uygulamanın giriş noktası. @SpringBootApplication bu package ve alt package'lardaki
 * controller, service, repository sınıflarını bulup çalıştırır.
 */
@SpringBootApplication
public class IntibakApplication {

    public static void main(String[] args) {
        SpringApplication.run(IntibakApplication.class, args);
    }
}
