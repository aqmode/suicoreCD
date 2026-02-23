import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// Плагин кластеризации ожидает L в window (UMD)
if (typeof window !== "undefined") (window as unknown as { L: typeof L }).L = L;
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import styles from "./DeliveryMap.module.css";
import { loadCdekPointsForLeaflet } from "./pointsLoader";

const DEFAULT_CENTER: L.LatLngTuple = [55.7558, 37.6173]; // Москва
const DEFAULT_ZOOM = 10;
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
}
// Схематичная белая карта — CARTO Positron (улицы, города, минимум деталей).
const CARTO_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png";
const TILE_URL = CARTO_URL;
const TILE_OPTIONS: L.TileLayerOptions = {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 19,
};

const minimalMarkerIcon = L.divIcon({
  className: "delivery-map-marker",
  html: "<span></span>",
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

export interface DeliveryMapPoint {
  coords: [number, number];
  address: string;
  code?: string;
  name?: string;
}

interface Props {
  onSelect?: (point: DeliveryMapPoint) => void;
  /** Выбранная точка ПВЗ — подсвечивается на карте */
  selectedPoint?: DeliveryMapPoint | null;
}

async function searchAddress(query: string): Promise<NominatimResult[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    q: query.trim(),
    format: "json",
    limit: "8",
    addressdetails: "0",
    countrycodes: "ru", // приоритет результатам в России
  });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      "Accept-Language": "ru",
      "User-Agent": "CDsuicoreMap/1.0 (https://github.com; map search)",
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

const selectedMarkerIcon = L.divIcon({
  className: "delivery-map-marker-selected",
  html: "<span></span>",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function DeliveryMap({ onSelect, selectedPoint = null }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHadNoResults, setSearchHadNoResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const handleSearch = useCallback(async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchResults([]);
    setSearchHadNoResults(false);
    setSearchError(null);
    try {
      const results = await searchAddress(q);
      setSearchResults(results);
      setSearchHadNoResults(results.length === 0);
    } catch {
      setSearchError("Ошибка поиска. Попробуйте ещё раз.");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  const handleSelectResult = useCallback((e: React.MouseEvent<HTMLButtonElement>, r: NominatimResult) => {
    e.preventDefault();
    e.stopPropagation();
    const latStr = (e.currentTarget as HTMLButtonElement).dataset.lat ?? r.lat;
    const lonStr = (e.currentTarget as HTMLButtonElement).dataset.lon ?? r.lon;
    const lat = parseFloat(String(latStr));
    const lon = parseFloat(String(lonStr));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const map = mapRef.current;
    if (map) {
      if (searchMarkerRef.current) {
        map.removeLayer(searchMarkerRef.current);
        searchMarkerRef.current = null;
      }
      const marker = L.marker([lat, lon], {
        icon: L.divIcon({
          className: "delivery-map-search-marker",
          html: "<span></span>",
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        }),
      }).addTo(map);
      searchMarkerRef.current = marker;

      // Сразу ставим центр и зум (без анимации), чтобы не сбрасывалось на Москву
      map.setView([lat, lon], 14);
      map.invalidateSize();

      // Обновляем форму после перелёта, чтобы ререндер не затронул карту
      requestAnimationFrame(() => {
        setSearchResults([]);
        setSearchQuery(r.display_name);
        setSearchError(null);
      });
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    const tileLayer = L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(map);
    tileLayerRef.current = tileLayer;

    L.control.zoom({ position: "topright" }).addTo(map);
    containerRef.current.classList.add(styles.mapRoot);
    mapRef.current = map;
    setLoading(false);

    const t = setTimeout(() => map.invalidateSize(), 100);

    (async () => {
      const points = await loadCdekPointsForLeaflet();
      if (!points?.length) return;

      const markers = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 60,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          const size = Math.min(28 + Math.ceil(Math.sqrt(count) * 6), 72);
          return L.divIcon({
            className: "delivery-map-cluster",
            html: `<span>${count}</span>`,
            iconSize: L.point(size, size),
            iconAnchor: [size / 2, size / 2],
          });
        },
      });

      for (const p of points) {
        const marker = L.marker([p.lat, p.lng], { icon: minimalMarkerIcon });
        marker.bindTooltip(p.hintContent, {
          permanent: false,
          direction: "top",
        });
        marker.on("click", () => {
          onSelectRef.current?.({
            coords: [p.lat, p.lng],
            address: p.hintContent,
            code: p.code,
            name: p.balloonContentHeader,
          });
        });
        markers.addLayer(marker);
      }

      map.addLayer(markers);
    })();

    return () => {
      clearTimeout(t);
      tileLayerRef.current = null;
      if (searchMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(searchMarkerRef.current);
      }
      if (selectedMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(selectedMarkerRef.current);
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Подсветка выбранного ПВЗ
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (selectedMarkerRef.current) {
      map.removeLayer(selectedMarkerRef.current);
      selectedMarkerRef.current = null;
    }
    if (selectedPoint?.coords?.length === 2) {
      const [lat, lng] = selectedPoint.coords;
      const marker = L.marker([lat, lng], { icon: selectedMarkerIcon }).addTo(map);
      selectedMarkerRef.current = marker;
      marker.bindTooltip("Выбранный ПВЗ", {
        permanent: false,
        direction: "top",
      });
    }
  }, [selectedPoint]);

  return (
    <div className={styles.wrapper}>
      {!error && (
        <div className={styles.searchForm} role="search">
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Город или адрес..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(e); }}
            aria-label="Поиск города или адреса"
          />
          <button type="button" className={styles.searchBtn} disabled={searchLoading} onClick={handleSearch}>
            {searchLoading ? "…" : "Найти"}
          </button>
          {searchResults.length > 0 && (
            <ul className={styles.searchResults}>
              {searchResults.map((r, i) => (
                <li key={`${r.lat}-${r.lon}-${i}`}>
                  <button
                    type="button"
                    className={styles.searchResultItem}
                    onClick={(e) => handleSelectResult(e, r)}
                    data-lat={r.lat}
                    data-lon={r.lon}
                  >
                    {r.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchHadNoResults && !searchLoading && (
            <div className={styles.searchNoResults}>Ничего не найдено</div>
          )}
          {searchError && (
            <div className={styles.searchError}>{searchError}</div>
          )}
        </div>
      )}
      {loading && !error && <div className={styles.loading}>Загрузка карты...</div>}
      {error && (
        <div className={styles.error}>
          Не удалось загрузить карту.
        </div>
      )}
      {!error && <div ref={containerRef} className={styles.container} />}
    </div>
  );
}
