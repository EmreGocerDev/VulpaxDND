const { webkit } = require('@playwright/test');
const path = require('path');

(async () => {
  console.log('--- Test Başlatılıyor: macOS WebKit ---');
  
  const browser = await webkit.launch();
  const page = await browser.newPage();

  // --- LOG YAKALAMA SİSTEMİ ---
  // Tarayıcı içindeki console.log, console.error vb. her şeyi terminale yazdırır
  page.on('console', msg => {
    console.log(`[TARAYICI LOG]: ${msg.text()}`);
  });

  // Sayfa içinde bir JavaScript hatası olursa yakalar
  page.on('pageerror', error => {
    console.log(`[TARAYICI HATA]: ${error.message}`);
  });

  // Ağ isteklerini takip et (Supabase'e gidiyor mu?)
  page.on('requestfailed', request => {
    console.log(`[AĞ HATASI]: ${request.url()} - Hata: ${request.failure().errorText}`);
  });

  await page.setViewportSize({ width: 1280, height: 800 });

  const filePath = `file://${path.join(process.cwd(), 'dist', 'index.html')}`;
  console.log(`Açılan dosya yolu: ${filePath}`);

  try {
    // Sayfaya git ve yüklenmesini bekle
    await page.goto(filePath, { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('Sayfa açıldı, verilerin gelmesi için 15 saniye bekleniyor...');
    // Supabase bağlantısı ve veri çekme işlemi için süreyi artırdık
    await page.waitForTimeout(15000);

    await page.screenshot({ path: 'macos-preview.png', fullPage: true });
    console.log('Ekran görüntüsü başarıyla alındı: macos-preview.png');

  } catch (err) {
    console.error('Test sırasında bir hata oluştu:', err);
  } finally {
    await browser.close();
    console.log('--- Test Tamamlandı ---');
  }
})();