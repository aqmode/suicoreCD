import { useEffect, useRef, useState } from "react";
import styles from "./YandexMap.module.css";
import { CDEK_PVZ_MOSCOW_FALLBACK, type CdekPvzItem } from "./cdekPvzFallback";
import { fetchPvzFromCdekApi } from "./cdekApi";
import { loadCdekPointsForMap } from "./cdekPointsLoader";

const CONTAINER_ID = "yandex-map-root";
const SCRIPT_ID = "yandex-maps-api";
const DEFAULT_CENTER: [number, number] = [55.7558, 37.6173]; // Москва
const DEFAULT_ZOOM = 10;
const APISHIP_POINTS_URL = "https://api.apiship.ru/v1/lists/points";

export interface YandexMapPoint {
  coords: [number, number];
  address: string;
  code?: string;
  name?: string;
}

async function fetchCdekPvz(apiToken: string): Promise<CdekPvzItem[]> {
  const filter = "providerKey=cdek;city=Москва;availableOperation=[2,3]";
  const url = `${APISHIP_POINTS_URL}?limit=100&offset=0&filter=${encodeURIComponent(filter)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", Authorization: apiToken },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { rows?: Array<{ lat?: number; lng?: number; address?: string; code?: string; name?: string }> };
  const rows = data?.rows ?? [];
  return rows
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      lat: r.lat!,
      lng: r.lng!,
      address: r.address ?? "",
      code: r.code ?? "",
      name: r.name ?? "",
    }));
}

interface Props {
  onSelect?: (point: YandexMapPoint) => void;
}

export default function YandexMap({ onSelect }: Props) {
  const mapRef = useRef<InstanceType<NonNullable<typeof window.ymaps>["Map"]> | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const key = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
    if (!key) {
      setError(true);
      setLoading(false);
      return;
    }
    if (document.getElementById(SCRIPT_ID)) {
      if (window.ymaps) setScriptReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
    script.async = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => {
      setError(true);
      setLoading(false);
    };
    document.head.appendChild(script);
    return () => {
      const s = document.getElementById(SCRIPT_ID);
      if (s) s.remove();
    };
  }, []);

  useEffect(() => {
    if (!scriptReady || !window.ymaps) return;

    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    const apiToken = import.meta.env.VITE_APISHIP_TOKEN as string | undefined;
    const cdekAccount = import.meta.env.VITE_CDEK_ACCOUNT as string | undefined;
    const cdekPassword = import.meta.env.VITE_CDEK_PASSWORD as string | undefined;

    window.ymaps!.ready(() => {
      try {
        const map = new window.ymaps!.Map(CONTAINER_ID, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
        });
        mapRef.current = map;
        setLoading(false);

        const customPlacemarkRef: { current: unknown } = { current: null };

        // Точки подгружаем асинхронно — карта уже отзывчива, 5000 точек не блокируют UI
        (async () => {
          const staticPoints = await loadCdekPointsForMap();
          if (staticPoints) {
            const { collection, byId } = staticPoints;
            const objectManager = new window.ymaps!.ObjectManager({
              clusterize: true,
              geoObjectOpenBalloonOnClick: false,
            });
            objectManager.add(collection);
            objectManager.objects.events.add("click", (e: { get: (key: string) => number }) => {
              const objectId = e.get("objectId");
              const feature = byId.get(objectId);
              if (!feature) return;
              if (customPlacemarkRef.current) {
                map.geoObjects.remove(customPlacemarkRef.current as never);
                customPlacemarkRef.current = null;
              }
              const coords: [number, number] = feature.geometry.coordinates;
              onSelectRef.current?.({
                coords,
                address: feature.properties?.hintContent ?? "",
                code: String(feature.id),
                name: feature.properties?.balloonContentHeader,
              });
            });
            map.geoObjects.add(objectManager);
            return;
          }

          let pvzList: CdekPvzItem[] = CDEK_PVZ_MOSCOW_FALLBACK;
          if (cdekAccount && cdekPassword) {
            try {
              const fromCdek = await fetchPvzFromCdekApi(cdekAccount, cdekPassword);
              if (fromCdek.length > 0) pvzList = fromCdek;
            } catch {
              //
            }
          }
          if (pvzList === CDEK_PVZ_MOSCOW_FALLBACK && apiToken) {
            try {
              const fromApi = await fetchCdekPvz(apiToken);
              if (fromApi.length > 0) pvzList = fromApi;
            } catch {
              //
            }
          }

          pvzList.forEach((pvz) => {
            const coords: [number, number] = [pvz.lat, pvz.lng];
            const placemark = new window.ymaps!.Placemark(
              coords,
              { balloonContent: pvz.address, hintContent: pvz.name || pvz.code },
              { preset: "islands#redCircleIcon" }
            );
            placemark.events.add("click", () => {
              if (customPlacemarkRef.current) {
                map.geoObjects.remove(customPlacemarkRef.current as never);
                customPlacemarkRef.current = null;
              }
              onSelectRef.current?.({
                coords,
                address: pvz.address,
                code: pvz.code,
                name: pvz.name,
              });
            });
            map.geoObjects.add(placemark);
          });
        })();

        // Клик по карте — произвольная точка (геокодирование)
        map.events.add("click", (e: { get: (key: string) => [number, number] }) => {
          const coords = (e.get("coordPosition") ?? e.get("coords")) as [number, number] | undefined;
          if (!coords || !window.ymaps) return;

          if (customPlacemarkRef.current) {
            map.geoObjects.remove(customPlacemarkRef.current as never);
          }
          const placemark = new window.ymaps!.Placemark(coords);
          map.geoObjects.add(placemark);
          customPlacemarkRef.current = placemark;

          window.ymaps.geocode(coords).then((res) => {
            let address = `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`;
            if (res.geoObjects.getLength() > 0) {
              const first = res.geoObjects.get(0) as { getAddressLine?: () => string; properties?: { get: (k: string) => string } };
              address = typeof first.getAddressLine === "function"
                ? first.getAddressLine()
                : (first.properties?.get?.("text") ?? address);
            }
            onSelectRef.current?.({ coords, address });
          });
        });
      } catch (err) {
        console.error("Yandex Map init error:", err);
        setError(true);
        setLoading(false);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [scriptReady]);

  return (
    <div className={styles.wrapper}>
      {loading && !error && <div className={styles.loading}>Загрузка карты...</div>}
      {error && (
        <div className={styles.error}>
          Не удалось загрузить карту. Проверьте API ключ Яндекс.Карт.
        </div>
      )}
      {!error && <div id={CONTAINER_ID} className={styles.container} />}
    </div>
  );
}
