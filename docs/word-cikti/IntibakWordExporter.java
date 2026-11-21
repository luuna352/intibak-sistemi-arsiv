// TASLAK: henüz derlenmedi, backend iskeleti kurulunca src/main/java altına taşınacak.
// Bağımlılık (Maven): org.apache.poi:poi-ooxml:5.3.0
//   (ClassNotFoundException çıkarsa poi-ooxml-full kullan.)
// Şablon: src/main/resources/templates/intibak-sablon.docx  (etiketler sablon-rehberi.md'de)
package tr.edu.yalova.intibak.export;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTRPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTRow;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTbl;
import org.springframework.stereotype.Component;

@Component
public class IntibakWordExporter {

    /** Şablondaki {{...}} etiketlerini yakalar. */
    private static final Pattern ETIKET = Pattern.compile("\\{\\{(\\w+)}}");

    /** Ders tablosundaki bir satır: solda karşı kurum, sağda Yalova dersi. */
    public record DersSatiri(
            String sKod, String sYariyil, String sAd, String sT, String sU, String sKredi, String sAkts, String sNot,
            String yKod, String yYariyil, String yAd, String yT, String yU, String yKredi, String yAkts, String yNot) {

        Map<String, String> toMap() {
            Map<String, String> m = new HashMap<>();
            m.put("s_kod", sKod);
            m.put("s_yariyil", sYariyil);
            m.put("s_ad", sAd);
            m.put("s_t", sT);
            m.put("s_u", sU);
            m.put("s_kredi", sKredi);
            m.put("s_akts", sAkts);
            m.put("s_not", sNot);
            m.put("y_kod", yKod);
            m.put("y_yariyil", yYariyil);
            m.put("y_ad", yAd);
            m.put("y_t", yT);
            m.put("y_u", yU);
            m.put("y_kredi", yKredi);
            m.put("y_akts", yAkts);
            m.put("y_not", yNot);
            return m;
        }
    }

    /**
     * @param sablon  intibak-sablon.docx akışı
     * @param alanlar tek değerli etiketler: aktifYil, adSoyad, tcNo, yerlesilenSinif, kayitTuru,
     *                oncekiKayitTarihi, gelinenKurum, baskanAd, uye1Ad, uye2Ad
     * @param dersler ders eşleştirme satırları (sırayla)
     * @return doldurulmuş, düzenlenebilir .docx baytları
     */
    public byte[] uret(InputStream sablon, Map<String, String> alanlar, List<DersSatiri> dersler) throws IOException {
        try (XWPFDocument doc = new XWPFDocument(sablon)) {
            // 1) Ders tablosunda şablon satırı bul, ders sayısı kadar çoğalt ve doldur.
            XWPFTable dersTablosu = doc.getTables().get(0);
            dersSatirlariniUret(dersTablosu, dersler);

            // 2) Geri kalan tek değerli etiketleri (üst bilgi, başlık, imza) doldur.
            for (XWPFParagraph p : tumParagraflar(doc)) {
                paragrafiDoldur(p, alanlar);
            }

            // 3) Çıktıda sarı yazı / kırmızı vurgu kalmasın.
            for (XWPFParagraph p : tumParagraflar(doc)) {
                for (XWPFRun r : p.getRuns()) {
                    vurguyuTemizle(r);
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.write(out);
            return out.toByteArray();
        }
    }

    // ---- Ders satırı çoğaltma -------------------------------------------------------------

    private void dersSatirlariniUret(XWPFTable tablo, List<DersSatiri> dersler) {
        CTTbl ct = tablo.getCTTbl();
        int sablonIndex = sablonSatirIndeksi(tablo);
        if (sablonIndex < 0) {
            throw new IllegalStateException("Şablonda {{s_kod}} etiketli ders satırı bulunamadı");
        }
        CTRow sablonSatir = ct.getTrArray(sablonIndex);

        if (dersler.isEmpty()) {
            ct.removeTr(sablonIndex); // ders yoksa boş şablon satırı kalmasın
            return;
        }

        // Şablon satırının kopyalarını altına ekle (ilk ders şablon satırının kendisine gider).
        // NOT: XWPFTable.addRow kullanılmıyor, çünkü satırı kopyalayıp eklediği için sonradan
        // wrapper üzerinden yapılan değişiklikler belgeye yansımayabiliyor. Doğrudan XML ile ekliyoruz.
        for (int i = 1; i < dersler.size(); i++) {
            CTRow yeni = ct.insertNewTr(sablonIndex + i);
            yeni.set(sablonSatir.copy());
        }
        for (int i = 0; i < dersler.size(); i++) {
            XWPFTableRow satir = new XWPFTableRow(ct.getTrArray(sablonIndex + i), tablo);
            for (XWPFTableCell hucre : satir.getTableCells()) {
                for (XWPFParagraph p : hucre.getParagraphs()) {
                    paragrafiDoldur(p, dersler.get(i).toMap());
                }
            }
        }
    }

    private int sablonSatirIndeksi(XWPFTable tablo) {
        List<XWPFTableRow> satirlar = tablo.getRows();
        for (int i = 0; i < satirlar.size(); i++) {
            if (satirlar.get(i).getTableCells().stream()
                    .anyMatch(c -> c.getText().contains("{{s_kod}}"))) {
                return i;
            }
        }
        return -1;
    }

    // ---- Etiket doldurma ------------------------------------------------------------------

    /**
     * Word bir etiketi birden çok "run" parçasına bölebilir ({{ad}}, Soy}} gibi). Bu yüzden
     * paragrafın tüm metni birleştirilir, etiketler değiştirilir ve sonuç ilk run'a yazılır.
     */
    private void paragrafiDoldur(XWPFParagraph p, Map<String, String> degerler) {
        List<XWPFRun> runlar = p.getRuns();
        if (runlar.isEmpty()) return;

        StringBuilder tam = new StringBuilder();
        for (XWPFRun r : runlar) tam.append(r.text());
        if (!tam.toString().contains("{{")) return;

        Matcher m = ETIKET.matcher(tam);
        StringBuilder sonuc = new StringBuilder();
        while (m.find()) {
            String deger = degerler.get(m.group(1));
            if (deger == null) deger = ""; // bilinmeyen/boş etiket: boş bırak (istenirse burada uyarı logla)
            m.appendReplacement(sonuc, Matcher.quoteReplacement(deger));
        }
        m.appendTail(sonuc);

        runlar.get(0).setText(sonuc.toString(), 0);
        for (int i = 1; i < runlar.size(); i++) runlar.get(i).setText("", 0);
    }

    private void vurguyuTemizle(XWPFRun r) {
        CTRPr rpr = r.getCTR().getRPr();
        if (rpr != null && rpr.isSetHighlight()) {
            rpr.unsetHighlight();
            if (rpr.isSetColor()) rpr.unsetColor(); // sarı yazıyı siyaha (varsayılana) çevir
        }
    }

    /** Gövde ve tablo hücrelerindeki tüm paragraflar. */
    private List<XWPFParagraph> tumParagraflar(XWPFDocument doc) {
        List<XWPFParagraph> liste = new ArrayList<>(doc.getParagraphs());
        for (XWPFTable t : doc.getTables()) {
            for (XWPFTableRow satir : t.getRows()) {
                for (XWPFTableCell hucre : satir.getTableCells()) {
                    liste.addAll(hucre.getParagraphs());
                }
            }
        }
        return liste;
    }
}

/* ---- Controller taslağı (ayrı dosya olacak) ------------------------------------------------

@RestController
class IntibakWordController {
    private final IntibakKayitService kayitService;
    private final IntibakWordExporter exporter;

    @GetMapping("/api/kayitlar/{id}/word")
    ResponseEntity<byte[]> indir(@PathVariable Long id) throws IOException {
        IntibakKayit kayit = kayitService.getOrThrow(id);
        if (!kayit.isOnaylandi()) {                       // "Kontrol ettim / Onaylıyorum" işaretli olmalı
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Kayıt onaylanmadan Word çıktısı alınamaz");
        }
        try (InputStream sablon = new ClassPathResource("templates/intibak-sablon.docx").getInputStream()) {
            byte[] docx = exporter.uret(sablon, kayitService.alanlar(kayit), kayitService.dersSatirlari(kayit));
            kayitService.wordeAktarildiIsaretle(id);      // durum: "Word'e aktarıldı", updated_by_name/at güncellenir
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("intibak-" + kayit.getTcNo() + ".docx", StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .body(docx);
        }
    }
}
*/
