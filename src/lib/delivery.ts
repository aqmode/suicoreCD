/**
 * Стоимость доставки из Казани.
 * Эталоны: Нижний Новгород 1300 ₽, Москва 1000 ₽, Владивосток 2300 ₽.
 * Модель: до Москвы (≈720 км) = 1000 ₽; ближе — дороже (Н. Новгород 400 км = 1300 ₽); дальше — +ставка за км.
 * Округление до 50 ₽.
 * Если задан VITE_PRICE_1RUB_NAME (тестовый режим) — доставка везде 1 ₽.
 */

const ONE_RUBLE_DELIVERY = !!(import.meta.env.VITE_PRICE_1RUB_NAME as string)?.trim();
const ORIGIN_LAT = 55.7886; // Казань
const ORIGIN_LON = 49.1222;

/** Расстояние от Казани до Москвы (≈720 км) — базовая точка, 1000 ₽ */
const MOSCOW_KM = 720;
const MOSCOW_RUB = 1000;
/** Н. Новгород ≈400 км от Казани, 1300 ₽ → ставка за каждый км ближе Москвы: (1300−1000)/(720−400) */
const NN_KM = 400;
const NN_RUB = 1300;
const RUB_PER_KM_BELOW = (NN_RUB - MOSCOW_RUB) / (MOSCOW_KM - NN_KM);
/** Владивосток ≈6400 км, 2300 ₽ → ставка за км дальше Москвы: (2300−1000)/(6400−720) */
const VLADIVOSTOK_KM = 5680;
const RUB_PER_KM_ABOVE = (2300 - MOSCOW_RUB) / VLADIVOSTOK_KM;

const MIN_DELIVERY_RUB = 800;
const MAX_DELIVERY_RUB = 2500;
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
 * Стоимость доставки в рублях из Казани до точки.
 * @param coords [lat, lon] выбранной точки (ПВЗ) или null — тогда 1000 ₽ (как до Москвы)
 * @param options.cartTotalRub — сумма товаров; если задан VITE_PRICE_1RUB_NAME, доставка всегда 1 ₽
 */
export function getDeliveryCostRub(
  coords: [number, number] | null,
  options?: { cartTotalRub?: number }
): number {
  if (ONE_RUBLE_DELIVERY) return 1; // тестовый режим — доставка 1 ₽ везде
  if (options?.cartTotalRub === 1) return 0; // тестовый заказ за 1 ₽ (без маркера) — без доставки
  if (!coords) return MOSCOW_RUB; // без точки — как до Москвы (1000 ₽)
  const km = distanceKm(coords[0], coords[1], ORIGIN_LAT, ORIGIN_LON);
  const raw =
    km <= MOSCOW_KM
      ? MOSCOW_RUB + (MOSCOW_KM - km) * RUB_PER_KM_BELOW
      : MOSCOW_RUB + (km - MOSCOW_KM) * RUB_PER_KM_ABOVE;
  const clamped = Math.min(MAX_DELIVERY_RUB, Math.max(MIN_DELIVERY_RUB, raw));
  return roundTo(clamped, ROUND_TO);
}
