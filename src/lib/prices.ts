// Цена 1 ₽ только если явно задан маркер (например test) — иначе все товары по обычным ценам
const ONE_RUBLE_MARKER = (import.meta.env.VITE_PRICE_1RUB_NAME as string)?.trim() || '';

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
