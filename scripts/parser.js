/**
 * Парсер pochta.ru: страна из аргумента → цена "Итого".
 * Запуск: node scripts/parser.js "Страна"
 */
import puppeteer from 'puppeteer';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const URL =
  'https://www.pochta.ru/shipment?type=PARCEL&weight=200&addressFrom=93b3df57-4c89-44df-ac42-96f05e9cd3b9';

const country = process.argv[2];
if (!country || !country.trim()) {
  console.error('Укажите страну: node scripts/parser.js "Страна"');
  process.exit(1);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Нажимаем "В другую страну" по координатам (при полном экране: x=540, y=740)
    await page.mouse.click(540, 740);
    await delay(800);

    // Открываем список "Город или страна получателя" и вводим страну
    const inputSelector = 'input[placeholder*="Город или страна получателя"]';
    await page.waitForSelector(inputSelector, { timeout: 15000 });
    await page.click(inputSelector);
    await page.type(inputSelector, country.trim(), { delay: 80 });

    // После ввода страны — клик по варианту из списка (при полном экране: x=760, y=840)
    await delay(1500);
    await page.mouse.click(760, 840);
    await delay(1000);

    // Нажимаем "Экспресс" по классу карточки или по тексту
    const clicked = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="CardSelectorstyles"], [class*="eFAnQR"]');
      const express = [...cards].find((e) => e.textContent && e.textContent.includes('Экспресс'));
      if (express) {
        express.click();
        return true;
      }
      return false;
    });
    if (!clicked) await page.mouse.click(840, 1100);
    await delay(1500);

    // Ждём обновления блока с итогом
    await delay(2500);

    // Ищем "Итого" и цену справа (класс с Font-sc-le1wax-0 или czSlZF)
    const totalPrice = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('*')).filter(
        (n) => n.textContent && n.textContent.trim() === 'Итого'
      );
      for (const label of labels) {
        let node = label.parentElement;
        for (let i = 0; i < 5 && node; i++) {
          const text = node.textContent || '';
          const priceEl = node.querySelector('[class*="czSlZF"], [class*="Font-sc-le1wax"]');
          if (priceEl) {
            const priceText = priceEl.textContent.trim().replace(/\s/g, '');
            const match = priceText.match(/[\d\s]+[.,]?\d*\s*₽?/);
            if (match) return match[0].trim();
          }
          const all = node.querySelectorAll('span, div');
          for (const el of all) {
            if (el.classList.contains('czSlZF') || (el.className && el.className.includes('Font-sc-le1wax'))) {
              const t = el.textContent.trim();
              if (/[\d.,]/.test(t)) return t.replace(/\s/g, '');
            }
          }
          node = node.parentElement;
        }
      }
      return null;
    });

    if (totalPrice) {
      console.log(totalPrice);
    } else {
      console.error('Цену "Итого" не найдено. Проверьте селекторы или задержки.');
      process.exitCode = 1;
    }
  } finally {
    // Браузер не закрываем — можно смотреть результат
  }
})();
