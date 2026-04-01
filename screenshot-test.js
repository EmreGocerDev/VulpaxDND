const { webkit } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await webkit.launch();
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1280, height: 800 });

  const filePath = `file://${path.join(process.cwd(), 'dist', 'index.html')}`;
  await page.goto(filePath);

  // Wait for components to load (Supabase auth screen etc.)
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'macos-preview.png', fullPage: true });

  console.log('Ekran görüntüsü alındı: macos-preview.png');
  await browser.close();
})();
