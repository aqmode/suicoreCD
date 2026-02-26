// Цена 1 ₽ только если явно задан маркер (например test) — иначе все товары по обычным ценам
const ONE_RUBLE_MARKER = (import.meta.env.VITE_PRICE_1RUB_NAME as string)?.trim() || '';

/** Процент скидки из VITE_DISCOUNT (0 = нет скидки). В .env: VITE_DISCOUNT=30 */
export function getDiscountPercent(): number {
  const v = Number(import.meta.env.VITE_DISCOUNT);
  if (!Number.isFinite(v) || v <= 0 || v >= 100) return 0;
  return Math.round(v);
}

/** Цена со скидкой; если VITE_DISCOUNT не задан — возвращает исходную цену */
export function getPriceWithDiscount(priceRub: number): number {
  const p = getDiscountPercent();
  if (p <= 0) return priceRub;
  return Math.max(1, Math.round(priceRub * (1 - p / 100)));
}

export function getPriceRub(releaseName: string, options?: { isFirstInCatalog?: boolean }): number {
  const name = releaseName?.toLowerCase() ?? '';
  if (ONE_RUBLE_MARKER && name.includes(ONE_RUBLE_MARKER.toLowerCase())) return 1;
  if (ONE_RUBLE_MARKER && options?.isFirstInCatalog) return 1;
  const diskOfNature = Number(import.meta.env.VITE_PRICE_DISK_OF_NATURE) || 950;
  const defaultPrice = Number(import.meta.env.VITE_PRICE_DEFAULT) || 800;
  return name.includes('disk of nature') ? diskOfNature : defaultPrice;
}

export function formatRub(n: number): string {
  return `${n} ₽`;
}
