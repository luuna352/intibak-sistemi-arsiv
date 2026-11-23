package tr.edu.yalova.intibak.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/**
 * Controller'lardan fırlayan exception'ları JSON hata cevabına çevirir. Cevap biçimi ProblemDetail (RFC 9457):
 * {"status": 400, "detail": "Görünen ad boş olamaz.", ...}. Frontend "detail" alanını ekranda gösterir.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(BadRequestException.class)
    public ProblemDetail badRequest(BadRequestException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(NotFoundException.class)
    public ProblemDetail notFound(NotFoundException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(LoginFailedException.class)
    public ProblemDetail loginFailed(LoginFailedException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, e.getMessage());
    }

    // Yüklenen dosya application.properties'teki sınırı (30 MB) aşarsa Spring bu exception'ı fırlatır.
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ProblemDetail tooLarge(MaxUploadSizeExceededException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Dosya en fazla 30 MB olabilir.");
    }

    // @Valid ile işaretli istek gövdesindeki kurallar (@NotBlank, @Size ...) tutmazsa: ilk hatanın mesajı döner.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail invalid(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("İstek geçersiz.");
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, message);
    }
}
