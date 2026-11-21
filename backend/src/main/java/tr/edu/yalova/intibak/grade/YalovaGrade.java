package tr.edu.yalova.intibak.grade;

import java.math.BigDecimal;

/**
 * Yalova Üniversitesi harf notları ve 4'lük katsayıları. Not tablosunda "Yalova puanı" ayrıca girilmez, buradan
 * okunur: harf seçilince puan kendiliğinden belli olur ve ikisi çelişemez. DZ: devamsız (0.00).
 */
public enum YalovaGrade {
    AA("4.00"), BA("3.50"), BB("3.00"), CB("2.50"), CC("2.00"), DC("1.50"), DD("1.00"), FD("0.50"), FF("0.00"),
    DZ("0.00");

    private final BigDecimal points;

    YalovaGrade(String points) {
        this.points = new BigDecimal(points);
    }

    public BigDecimal points() {
        return points;
    }
}
