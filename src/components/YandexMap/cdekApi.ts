/**
 * Загрузка списка ПВЗ СДЭК через пакет cdek (api.cdek.ru/v2/deliverypoints).
 * Требуются учётные данные API СДЭК (Account и Secure password из личного кабинета).
 */
import type { CdekPvzItem } from "./cdekPvzFallback";

const DEFAULT_CITY = "Москва";
const DEFAULT_COUNTRY = "RU";

export async function fetchPvzFromCdekApi(
  account: string,
  password: string
): Promise<CdekPvzItem[]> {
  const mod = await import("cdek");
  const CdekClass = mod.Cdek ?? (mod as { default?: typeof mod.Cdek }).default;
  if (!CdekClass) throw new Error("Cdek not found");
  const client = new CdekClass({
    account,
    password,
    url_base: "https://api.cdek.ru/v2",
  });

  const cities = await client.getCities({
    city: DEFAULT_CITY,
    country_codes: [DEFAULT_COUNTRY],
    size: 1,
  });
  const cityCode = cities?.[0]?.code;
  if (cityCode == null) return [];

  const points = await client.getPickupPoints({
    city_code: cityCode,
    type: "PVZ",
    lang: "rus",
  });

  type Point = (typeof points)[number] & { location?: { latitude?: number; longitude?: number; address_full?: string } };
  return (points ?? [])
    .filter((p: Point) => p.location?.latitude != null && p.location?.longitude != null)
    .map((p: Point) => ({
      lat: p.location!.latitude!,
      lng: p.location!.longitude!,
      address: p.location?.address_full ?? "",
      code: p.code ?? "",
      name: p.name ?? "",
    }));
}
