package tr.edu.yalova.intibak.grade;

/**
 * Not tablosunun türü: karşı üniversite notu nasıl veriyor (V12). EK-1'deki üç tablo buna göre farklı sütunlara
 * sahiptir; ekran ve satır kuralları türe göre değişir. Yeni bir not sistemi eklenirken türü seçilir.
 */
public enum GradeSystem {
    /** 100'lük puan: her satır bir puan aralığı (90-100) ya da özel not (DEVAMSIZ). EK-1'de PT1. */
    SCORE,
    /** Harf ve sayı: her satırda harf notu ve isteğe bağlı sayı karşılığı (A 4.00). EK-1'de PT2. */
    LETTER_NUMBER,
    /** Sadece harf: her satırda harf notu, sayı yok (A1 ... F3). EK-1'de PT3. */
    LETTER
}
