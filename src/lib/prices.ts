export function getPriceRub(releaseName: string): number {
  const diskOfNature = Number(import.meta.env.VITE_PRICE_DISK_OF_NATURE) || 950;
  const defaultPrice = Number(import.meta.env.VITE_PRICE_DEFAULT) || 800;
  return releaseName?.toLowerCase().includes('disk of nature') ? diskOfNature : defaultPrice;
}

export function formatRub(n: number): string {
  return `${n} ₽`;
}
