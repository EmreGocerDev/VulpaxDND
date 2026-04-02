const { webkit } = require('@playwright/test');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Basit bir yerel sunucu kuruyoruz ki "file://" hatasından kurtulalım
const server = http.createServer((req, res) => {
  let filePath = path.join(process.cwd(), 'dist', req.url === '/' ? 'index.html' : req.url);
  
  // Dosya uzantısına göre Content-Type belirle
  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png'
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Dosya bulunamadi');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(3000, async () => {
  console.log('--- Yerel sunucu baslatildi: http://localhost:3000 ---');
  
  const browser = await webkit.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[TARAYICI LOG]: ${msg.text()}`));
  page.on('pageerror', error => console.log(`[TARAYICI HATA]: ${error.message}`));

  try {
    // Artik file:// yerine localhost üzerinden gidiyoruz!
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('Sayfa yuklendi, 10 saniye bekleniyor...');
    await page.waitForTimeout(10000);

    await page.screenshot({ path: 'macos-preview.png', fullPage: true });
    console.log('Ekran görüntüsü alindi!');
  } catch (err) {
    console.error('Hata:', err);
  } finally {
    await browser.close();
    server.close();
  }
});