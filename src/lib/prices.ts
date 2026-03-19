// Цена 1 ₽ только если явно задан маркер (например test) — иначе все товары по обычным ценам
const ONE_RUBLE_MARKER = (import.meta.env.VITE_PRICE_1RUB_NAME as string)?.trim() || '';

/** Глобальная скидка из .env (0–100). VITE_DISCOUNT=30 → 30% скидка */
const GLOBAL_DISCOUNT = Math.min(100, Math.max(0, Number(import.meta.env.VITE_DISCOUNT) || 0));

/** Базовая цена без скидки */
export function getOriginalPriceRub(releaseName: string, options?: { isFirstInCatalog?: boolean }): number {
  const name = releaseName?.toLowerCase() ?? '';
  if (ONE_RUBLE_MARKER && name.includes(ONE_RUBLE_MARKER.toLowerCase())) return 1;
  if (ONE_RUBLE_MARKER && options?.isFirstInCatalog) return 1;
  const diskOfNature = Number(import.meta.env.VITE_PRICE_DISK_OF_NATURE) || 950;
  const defaultPrice = Number(import.meta.env.VITE_PRICE_DEFAULT) || 800;
  return name.includes('disk of nature') ? diskOfNature : defaultPrice;
}

/** Финальная цена со скидкой */
export function getPriceRub(releaseName: string, options?: { isFirstInCatalog?: boolean }): number {
  const original = getOriginalPriceRub(releaseName, options);
  if (original <= 1 || GLOBAL_DISCOUNT <= 0) return original;
  return Math.round(original * (1 - GLOBAL_DISCOUNT / 100));
}

/** Текущий процент скидки (0 если нет) */
export function getDiscountPercent(): number {
  return GLOBAL_DISCOUNT;
}

export function formatRub(n: number): string {
  return `${n} ₽`;
}
