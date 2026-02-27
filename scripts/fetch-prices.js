/**
 * Парсит цены доставки по странам с pochta.ru (страница рендерится JS — нужен Puppeteer).
 * Сохраняет JSON с ценами и HTML каждой страницы после рендера в ту же папку.
 * Запуск: node scripts/fetch-prices.js
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COUNTRIES_PATH = join(__dirname, 'countries.json');
const OUT_PATH = join(__dirname, 'countries-prices.json');
const PAGES_DIR = __dirname;

function safeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-').trim() || 'page';
}

const BASE_URL =
  'https://www.pochta.ru/shipment?type=PARCEL&weight=200&addressFrom=555e7d61-d9a7-4ba6-9770-6caa8198c483&rapid=true';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const LIMIT = 5;

async function main() {
  const all = JSON.parse(readFileSync(COUNTRIES_PATH, 'utf8'));
  const countries = all.slice(0, LIMIT);
  const results = [];

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    for (let i = 0; i < countries.length; i++) {
      const country = countries[i];
      const url = `${BASE_URL}&countryToCode=${country.id}&countryToName=${encodeURIComponent(country.name)}`;
      process.stderr.write(`\r${i + 1}/${countries.length} ${country.name}...`);

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
        await delay(2000);

        await page.waitForFunction(
          () => document.body && document.body.textContent && document.body.textContent.includes('Итого'),
          { timeout: 15000 }
        ).catch(() => {});

        const price = await page.evaluate(() => {
          const parseNum = (text) => {
            const m = (text || '').match(/(\d[\d\s]*[.,]?\d*)/);
            return m ? parseFloat(m[1].replace(/\s/g, '').replace(',', '.')) : null;
          };
          const byClass = document.querySelector('[class*="hsxCQj"]');
          if (byClass) {
            const n = parseNum(byClass.textContent);
            if (n != null) return n;
          }
          let row = null;
          for (const el of document.querySelectorAll('*')) {
            const t = el.textContent || '';
            if (t.trim() === 'Итого' || (t.includes('Итого') && t.length < 50)) {
              row = el.closest('div') || el.parentElement;
              break;
            }
          }
          if (row) {
            for (const el of row.querySelectorAll('[class*="Font-sc-le1wax"], [class*="hsxCQj"], span, div')) {
              const t = el.textContent || '';
              if (t.includes('₽') && /\d/.test(t)) {
                const n = parseNum(t);
                if (n != null) return n;
              }
            }
            const siblings = row.parentElement ? row.parentElement.children : [];
            for (const s of siblings) {
              const t = s.textContent || '';
              if (!t.includes('Итого') && t.includes('₽') && /\d/.test(t)) {
                const n = parseNum(t);
                if (n != null) return n;
              }
            }
          }
          let lastPrice = null;
          for (const el of document.querySelectorAll('*')) {
            if (el.children.length > 0) continue;
            const t = el.textContent || '';
            if (t.includes('₽') && /\d/.test(t) && t.length < 30) {
              const n = parseNum(t);
              if (n != null) lastPrice = n;
            }
          }
          return lastPrice;
        });

        const html = await page.content();
        const pagePath = join(PAGES_DIR, `${country.id}-${safeFilename(country.name)}.html`);
        writeFileSync(pagePath, html, 'utf8');

        results.push({ id: country.id, name: country.name, price });
      } catch (e) {
        results.push({ id: country.id, name: country.name, price: null, error: e.message });
      }

      await delay(500);
    }

    writeFileSync(OUT_PATH, JSON.stringify(results, null, 2), 'utf8');
    console.error(`\nГотово. Цены → ${OUT_PATH}, HTML страниц → ${PAGES_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
