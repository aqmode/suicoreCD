/**
 * Запасной список ПВЗ СДЭК по Москве (если нет ApiShip API токена).
 * Координаты примерные по открытым данным.
 */
export interface CdekPvzItem {
  lat: number;
  lng: number;
  address: string;
  code: string;
  name: string;
}

export const CDEK_PVZ_MOSCOW_FALLBACK: CdekPvzItem[] = [
  { lat: 55.7558, lng: 37.6173, code: "MSK001", name: "СДЭК Тверская", address: "г Москва, ул Тверская, д 1" },
  { lat: 55.7512, lng: 37.6184, code: "MSK002", name: "СДЭК Красная площадь", address: "г Москва, Красная площадь" },
  { lat: 55.7612, lng: 37.6065, code: "MSK003", name: "СДЭК Арбат", address: "г Москва, ул Арбат" },
  { lat: 55.7312, lng: 37.6254, code: "MSK004", name: "СДЭК Павелецкая", address: "г Москва, Павелецкая пл" },
  { lat: 55.7745, lng: 37.6321, code: "MSK005", name: "СДЭК Сухаревская", address: "г Москва, Сухаревская пл" },
  { lat: 55.7401, lng: 37.6178, code: "MSK006", name: "СДЭК Серпуховская", address: "г Москва, ул Серпуховская" },
  { lat: 55.7689, lng: 37.6412, code: "MSK007", name: "СДЭК Комсомольская", address: "г Москва, Комсомольская пл" },
  { lat: 55.7267, lng: 37.5876, code: "MSK008", name: "СДЭК Тульская", address: "г Москва, Варшавское ш" },
];
