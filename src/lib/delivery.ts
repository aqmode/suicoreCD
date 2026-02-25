/**
 * Стоимость доставки из Нижнего Новгорода.
 * Москва (≈400 км) = 540 ₽ — эталон. Остальные регионы по расстоянию от Н. Новгорода.
 * Модель: базовая ставка + руб/км; округление до 50 ₽.
 */

const ORIGIN_LAT = 56.3287; // Нижний Новгород
const ORIGIN_LON = 44.002;

/** Москва ≈ 400 км от Н. Новгорода, доставка 540 ₽ → ~0.85 ₽/км при базе 200 ₽ */
const BASE_RUB = 200;
const RUB_PER_KM = 0.85;
const MIN_DELIVERY_RUB = 470;
const MAX_DELIVERY_RUB = 750;
const ROUND_TO = 50;

/** Расстояние между двумя точками (lat, lon) в км, формула Haversine */
function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Стоимость доставки в рублях из Нижнего Новгорода до точки.
 * @param coords [lat, lon] выбранной точки (ПВЗ) или null — тогда базовая 540 ₽ (как до Москвы)
 * @param options.cartTotalRub — сумма товаров; если 1 ₽ (тестовый товар), доставка 0 ₽ для проверки оплаты
 */
export function getDeliveryCostRub(
  coords: [number, number] | null,
  options?: { cartTotalRub?: number }
): number {
  if (options?.cartTotalRub === 1) return 0; // тестовый заказ за 1 ₽ — без доставки для проверки оплаты
  if (!coords) return 540; // без точки — как до Москвы
  const km = distanceKm(coords[0], coords[1], ORIGIN_LAT, ORIGIN_LON);
  const raw = BASE_RUB + RUB_PER_KM * km;
  const clamped = Math.min(MAX_DELIVERY_RUB, Math.max(MIN_DELIVERY_RUB, raw));
  return roundTo(clamped, ROUND_TO);
}
