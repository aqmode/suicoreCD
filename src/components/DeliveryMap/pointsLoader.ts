/**
 * Загрузка ПВЗ СДЭК из points.json (YandexMap).
 * Поддерживает формат API: { success, data: { data: [...] } } с cityCode; названия городов из cities.json.
 */

/** Точка в новом формате API */
interface CdekApiPoint {
  id: number;
  code: string;
  type?: string;
  cityCode: number;
  geoLatitude: string;
  geoLongitude: string;
  address: string;
  brandName?: string;
}

/** Старый формат GeoJSON (для обратной совместимости) */
interface CdekJsonFeature {
  type: "Feature";
  id: number;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    balloonContentHeader?: string;
    balloonContentBody?: string;
    hintContent?: string;
  };
}

/** Формат points.json: либо API (success + data.data), либо GeoJSON (features) */
interface PointsJson {
  success?: boolean;
  data?: { data?: CdekApiPoint[] };
  features?: CdekJsonFeature[];
}

export interface LeafletPoint {
  lat: number;
  lng: number;
  id: number;
  code: string;
  hintContent: string;
  balloonContentHeader: string;
}

/** Загружает маппинг cityCode → название города из cities.json (если есть). */
async function loadCitiesMap(): Promise<Record<number, string>> {
  try {
    const mod = await import("../YandexMap/cities.json");
    const raw = mod.default as Record<string, string>;
    if (!raw || typeof raw !== "object") return {};
    const map: Record<number, string> = {};
    for (const [key, name] of Object.entries(raw)) {
      const code = Number(key);
      if (!Number.isNaN(code) && name) map[code] = name;
    }
    return map;
  } catch {
    return {};
  }
}

export async function loadCdekPointsForLeaflet(): Promise<LeafletPoint[] | null> {
  try {
    const mod = await import("../YandexMap/points.json");
    const raw = mod.default as unknown as PointsJson;

    const cities = await loadCitiesMap();

    // Новый формат API: { success, data: { data: [...] } }
    if (raw?.success && Array.isArray(raw.data?.data)) {
      const items = raw.data.data;
      return items.map((p: CdekApiPoint) => {
        const lat = parseFloat(p.geoLatitude);
        const lng = parseFloat(p.geoLongitude);
        const cityName = cities[p.cityCode] ?? null;
        const title = cityName
          ? `СДЭК ${p.code} · ${cityName}`
          : `СДЭК ${p.code}`;
        return {
          lat: Number.isFinite(lat) ? lat : 0,
          lng: Number.isFinite(lng) ? lng : 0,
          id: p.id,
          code: p.code,
          hintContent: p.address,
          balloonContentHeader: title,
        };
      }).filter((p: LeafletPoint) => p.lat !== 0 || p.lng !== 0);
    }

    // Старый формат GeoJSON FeatureCollection
    if (Array.isArray(raw?.features) && raw.features.length > 0) {
      return raw.features.map((f: CdekJsonFeature) => {
        const [lat, lng] = f.geometry.coordinates;
        return {
          lat,
          lng,
          id: f.id,
          code: String(f.id),
          hintContent: f.properties?.hintContent ?? "",
          balloonContentHeader: f.properties?.balloonContentHeader ?? "",
        };
      });
    }

    return null;
  } catch {
    return null;
  }
}
