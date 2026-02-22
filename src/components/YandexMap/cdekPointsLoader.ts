/**
 * Загрузка ПВЗ СДЭК из points.json (в папке YandexMap).
 * Формат: GeoJSON FeatureCollection, coordinates [lat, lng], properties — balloonContentHeader, balloonContentBody, hintContent.
 */

export interface CdekJsonFeature {
  type: "Feature";
  id: number;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    balloonContentHeader?: string;
    balloonContentBody?: string;
    hintContent?: string;
  };
}

export interface CdekJsonFeatureCollection {
  type: "FeatureCollection";
  features: CdekJsonFeature[];
}

export interface YandexFeature {
  type: "Feature";
  id: number;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    hintContent?: string;
    balloonContent?: string;
  };
}

/**
 * Загружает ./points.json и возвращает коллекцию для ymaps.ObjectManager.add().
 */
export async function loadCdekPointsForMap(): Promise<{
  collection: { type: "FeatureCollection"; features: YandexFeature[] };
  byId: Map<number, CdekJsonFeature>;
} | null> {
  try {
    const mod = await import("./points.json");
    const raw = mod.default as unknown as CdekJsonFeatureCollection;
    if (!raw?.features?.length) return null;

    const byId = new Map<number, CdekJsonFeature>();
    const features: YandexFeature[] = raw.features.map((f) => {
      byId.set(f.id, f);
      const header = f.properties?.balloonContentHeader ?? "";
      const body = f.properties?.balloonContentBody ?? "";
      return {
        type: "Feature" as const,
        id: f.id,
        geometry: f.geometry,
        properties: {
          hintContent: f.properties?.hintContent ?? header,
          balloonContent: body ? `${header}<br/>${body}` : header,
        },
      };
    });

    return {
      collection: { type: "FeatureCollection", features },
      byId,
    };
  } catch {
    return null;
  }
}
