package tr.edu.yalova.intibak.record;

/** TC Kimlik No kontrolü ve listede gizleme. */
final class TcNo {

    private TcNo() {
    }

    /**
     * Resmi algoritma: 11 hane, ilk hane 0 olamaz;
     * 10. hane = ((1, 3, 5, 7, 9. hanelerin toplamı) * 7 - (2, 4, 6, 8. hanelerin toplamı)) mod 10;
     * 11. hane = ilk 10 hanenin toplamı mod 10. Yanlış yazılmış numaraların çoğunu yakalar.
     */
    static boolean isValid(String tc) {
        if (tc == null || !tc.matches("[1-9][0-9]{10}")) {
            return false;
        }
        int[] d = tc.chars().map(c -> c - '0').toArray();
        int odd = d[0] + d[2] + d[4] + d[6] + d[8];
        int even = d[1] + d[3] + d[5] + d[7];
        // Math.floorMod: negatif sonuçta da 0-9 arası verir (Java'daki % negatif olabilir).
        int tenth = Math.floorMod(odd * 7 - even, 10);
        int sumFirstTen = odd + even + d[9];
        return d[9] == tenth && d[10] == sumFirstTen % 10;
    }

    /** Listede kişisel veri azaltma (KVKK): "12345678901" -> "123•••••901". Tamamı sadece kaydın içinde görünür. */
    static String mask(String tc) {
        return tc.substring(0, 3) + "•••••" + tc.substring(8);
    }
}
