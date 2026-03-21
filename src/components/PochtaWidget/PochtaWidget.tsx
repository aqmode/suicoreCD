import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiPochtaNearby, apiPochtaTariff, type PochtaOffice } from "../../lib/api";
import { getDeliveryCostRub } from "../../lib/delivery";
import styles from "./PochtaWidget.module.css";

/* ── Public interface (consumed by CheckoutPage) ── */
export interface PochtaPoint {
  pvz_code: string;
  address: string;
  pvz_name: string;
  delivery_rub: number;
  city: string | null;
  coords: [number, number] | null;
  deliveryDays: string | null;
}

interface CityEntry {
  city: string;
  coordinates: string;
}

interface Props {
  onSelect: (point: PochtaPoint) => void;
  diskCount?: number;
}

/* ── CARTO tile (same as DeliveryMap) ── */
const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png";
const TILE_OPTIONS: L.TileLayerOptions = {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 19,
};

/* ── Markers ── */
const officeIcon = L.divIcon({
  className: "pochta-marker",
  html: "<span></span>",
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const officeIconActive = L.divIcon({
  className: "pochta-marker pochta-marker--active",
  html: "<span></span>",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function distanceLabel(m: number): string {
  return m < 1000 ? `${m} м` : `${(m / 1000).toFixed(1)} км`;
}

/* ══════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════ */
export default function PochtaWidget({ onSelect, diskCount = 1 }: Props) {
  const [cities, setCities] = useState<CityEntry[]>([]);
  useEffect(() => {
    fetch("/cities.json").then((r) => r.json()).then((d) => setCities(d)).catch(() => {});
  }, []);

  const [cityQuery, setCityQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityEntry | null>(null);

  const suggestions = useMemo(() => {
    if (!cityQuery.trim() || cityQuery.length < 2) return [];
    const q = cityQuery.toLowerCase();
    return cities.filter((c) => c.city.toLowerCase().includes(q)).slice(0, 8);
  }, [cityQuery, cities]);

  const [offices, setOffices] = useState<PochtaOffice[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackTariff, setFallbackTariff] = useState<number | null>(null);
  const [fallbackConfirmed, setFallbackConfirmed] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<PochtaOffice | null>(null);
  const [tariff, setTariff] = useState<{ rub: number; minDays: number | null; maxDays: number | null } | null>(null);
  const [loadingTariff, setLoadingTariff] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const handleOfficeClickRef = useRef<(o: PochtaOffice) => void>(() => {});

  /* Init Leaflet map once */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [55.75, 37.62], zoom: 11, maxZoom: 19, zoomControl: false });
    L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markersRef.current.clear(); };
  }, []);

  /* Redraw markers when offices or selection changes */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current.clear();
    if (offices.length === 0) return;
    offices.forEach((o) => {
      const isActive = selectedOffice?.postalCode === o.postalCode;
      const marker = L.marker([o.latitude, o.longitude], { icon: isActive ? officeIconActive : officeIcon }).addTo(map);
      marker.bindTooltip(`${o.postalCode} — ${o.address}`, { direction: "top" });
      marker.on("click", () => handleOfficeClickRef.current(o));
      markersRef.current.set(o.postalCode, marker);
    });
    const lats = offices.map((o) => o.latitude);
    const lons = offices.map((o) => o.longitude);
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]],
      { padding: [32, 32], maxZoom: 14 },
    );
  }, [offices, selectedOffice]);

  const handleOfficeClick = useCallback(async (o: PochtaOffice) => {
    setSelectedOffice(o);
    setConfirmed(false);
    setTariff(null);
    setLoadingTariff(true);
    markersRef.current.forEach((m, code) => m.setIcon(code === o.postalCode ? officeIconActive : officeIcon));
    mapRef.current?.setView([o.latitude, o.longitude], Math.max(mapRef.current.getZoom(), 13));
    try {
      const { data } = await apiPochtaTariff(o.postalCode, diskCount);
      if (data?.deliveryRub) {
        setTariff({ rub: data.deliveryRub, minDays: data.minDays, maxDays: data.maxDays });
      } else {
        setTariff({ rub: getDeliveryCostRub(o.settlement, null, diskCount), minDays: null, maxDays: null });
      }
    } catch {
      setTariff({ rub: getDeliveryCostRub(o.settlement, null, diskCount), minDays: null, maxDays: null });
    } finally {
      setLoadingTariff(false);
    }
  }, [diskCount]);

  handleOfficeClickRef.current = handleOfficeClick;

  const pickCity = useCallback(async (entry: CityEntry) => {
    setSelectedCity(entry);
    setCityQuery(entry.city);
    setShowSuggestions(false);
    setSelectedOffice(null);
    setTariff(null);
    setConfirmed(false);
    setFallbackMode(false);
    setFallbackTariff(null);
    setFallbackConfirmed(false);

    const [lat, lon] = entry.coordinates.split(",").map((s) => parseFloat(s.trim()));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    setLoadingOffices(true);
    try {
      const { data, error } = await apiPochtaNearby(lat, lon, 40);
      if (error || !data || data.length === 0) {
        setFallbackMode(true);
        setFallbackTariff(getDeliveryCostRub(entry.city, [lat, lon], diskCount));
        setOffices([]);
        mapRef.current?.setView([lat, lon], 12);
        return;
      }
      setOffices(data);
    } catch {
      setFallbackMode(true);
      setFallbackTariff(getDeliveryCostRub(entry.city, [lat, lon], diskCount));
      setOffices([]);
      mapRef.current?.setView([lat, lon], 12);
    } finally {
      setLoadingOffices(false);
    }
  }, [diskCount]);

  /* Re-calc when diskCount changes */
  useEffect(() => {
    if (selectedOffice) handleOfficeClick(selectedOffice);
    else if (fallbackMode && selectedCity) {
      const [lat, lon] = selectedCity.coordinates.split(",").map((s) => parseFloat(s.trim()));
      const coords: [number, number] | null = Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
      setFallbackTariff(getDeliveryCostRub(selectedCity.city, coords, diskCount));
    }
  }, [diskCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = () => {
    if (!selectedOffice || !tariff) return;
    setConfirmed(true);
    const daysText = tariff.minDays != null && tariff.maxDays != null
      ? tariff.minDays === tariff.maxDays ? `${tariff.minDays} дн.` : `${tariff.minDays}–${tariff.maxDays} дн.`
      : tariff.maxDays != null ? `до ${tariff.maxDays} дн.` : null;
    onSelectRef.current({
      pvz_code: selectedOffice.postalCode,
      address: `${selectedCity?.city ?? selectedOffice.settlement}, ${selectedOffice.address}`,
      pvz_name: `Почта России ${selectedOffice.postalCode}`,
      delivery_rub: tariff.rub,
      city: selectedOffice.settlement || selectedCity?.city || null,
      coords: [selectedOffice.latitude, selectedOffice.longitude],
      deliveryDays: daysText,
    });
  };

  const handleFallbackConfirm = () => {
    if (!selectedCity || fallbackTariff == null) return;
    setFallbackConfirmed(true);
    const [lat, lon] = selectedCity.coordinates.split(",").map((s) => parseFloat(s.trim()));
    const coords: [number, number] | null = Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
    onSelectRef.current({
      pvz_code: selectedCity.city,
      address: selectedCity.city,
      pvz_name: `Почта России — ${selectedCity.city}`,
      delivery_rub: fallbackTariff,
      city: selectedCity.city,
      coords,
      deliveryDays: "5–14 дн.",
    });
  };

  const daysLabel = tariff
    ? tariff.minDays != null && tariff.maxDays != null
      ? tariff.minDays === tariff.maxDays ? `${tariff.minDays} дн.` : `${tariff.minDays}–${tariff.maxDays} дн.`
      : tariff.maxDays != null ? `до ${tariff.maxDays} дн.` : ""
    : "";

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputGroup}>
        <input
          type="text"
          className={styles.cityInput}
          placeholder="Введите город (напр. Москва)"
          value={cityQuery}
          onChange={(e) => {
            setCityQuery(e.target.value);
            setShowSuggestions(true);
            setSelectedCity(null);
            setOffices([]);
            setSelectedOffice(null);
            setTariff(null);
            setConfirmed(false);
            setFallbackMode(false);
            setFallbackTariff(null);
            setFallbackConfirmed(false);
          }}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          aria-label="Город доставки"
          autoComplete="off"
        />
        {loadingOffices && <span className={styles.spinner} />}
        {showSuggestions && suggestions.length > 0 && (
          <ul className={styles.suggestions}>
            {suggestions.map((s, i) => (
              <li key={`${s.city}-${i}`} className={styles.suggestionItem} onMouseDown={() => pickCity(s)}>
                {s.city}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Map — always rendered so Leaflet can attach; hidden until city selected */}
      <div className={styles.mapSection} style={{ display: selectedCity && !fallbackMode ? "block" : "none" }}>
        <div ref={containerRef} className={styles.mapContainer} />
      </div>

      {/* Fallback card */}
      {fallbackMode && selectedCity && fallbackTariff != null && (
        <div className={styles.resultCard}>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Город:</span>
            <span className={styles.resultValue}>{selectedCity.city}</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Стоимость доставки:</span>
            <span className={`${styles.resultValue} ${styles.price}`}>{fallbackTariff} ₽</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Ориент. срок:</span>
            <span className={styles.resultValue}>5–14 дн.</span>
          </div>
          {diskCount > 1 && <p className={styles.diskHint}>Расчёт для {diskCount} дисков</p>}
          <p className={styles.diskHint}>Точный адрес отделения уточним после оплаты.</p>
          {!fallbackConfirmed ? (
            <button type="button" className={styles.confirmBtn} onClick={handleFallbackConfirm}>
              Подтвердить город доставки
            </button>
          ) : (
            <p className={styles.confirmedText}>✓ Город подтверждён</p>
          )}
        </div>
      )}

      {/* Office list */}
      {offices.length > 0 && (
        <div className={styles.officeList}>
          <p className={styles.officeListTitle}>Отделения рядом ({offices.length})</p>
          <div className={styles.officeListScroll}>
            {offices.map((o) => (
              <button
                key={o.postalCode}
                type="button"
                className={`${styles.officeItem} ${selectedOffice?.postalCode === o.postalCode ? styles.officeItemActive : ""}`}
                onClick={() => handleOfficeClick(o)}
              >
                <span className={styles.officeCode}>{o.postalCode}</span>
                <span className={styles.officeAddr}>{o.address}</span>
                <span className={styles.officeDist}>{distanceLabel(o.distance)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected office card */}
      {selectedOffice && (
        <div className={styles.resultCard}>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Отделение:</span>
            <span className={styles.resultValue}>{selectedOffice.postalCode} — {selectedOffice.address}</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Город:</span>
            <span className={styles.resultValue}>
              {selectedOffice.settlement}
              {selectedOffice.region && selectedOffice.region !== selectedOffice.settlement ? `, ${selectedOffice.region}` : ""}
            </span>
          </div>
          {loadingTariff ? (
            <p className={styles.tariffLoading}>Расчёт стоимости…</p>
          ) : tariff ? (
            <>
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>Стоимость доставки:</span>
                <span className={`${styles.resultValue} ${styles.price}`}>{tariff.rub} ₽</span>
              </div>
              {daysLabel && (
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>Срок:</span>
                  <span className={styles.resultValue}>{daysLabel}</span>
                </div>
              )}
              {diskCount > 1 && <p className={styles.diskHint}>Расчёт для {diskCount} дисков</p>}
              {!confirmed ? (
                <button type="button" className={styles.confirmBtn} onClick={handleConfirm}>
                  Подтвердить отделение
                </button>
              ) : (
                <p className={styles.confirmedText}>✓ Отделение подтверждено</p>
              )}
            </>
          ) : null}
        </div>
      )}

      <p className={styles.hint}>
        {fallbackMode
          ? "Стоимость рассчитана по расстоянию от Казани. Отделение уточним после оплаты."
          : "Выберите город — на карте появятся ближайшие почтовые отделения. Нажмите на отделение для расчёта стоимости."}
      </p>
    </div>
  );
}
