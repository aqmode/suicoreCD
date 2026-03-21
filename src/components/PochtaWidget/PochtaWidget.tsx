import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
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
const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png";
const TILE_OPTIONS: L.TileLayerOptions = {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 19,
  detectRetina: true,
};

/* ── Markers ── */
const officeIcon = L.divIcon({
  className: "pochta-marker",
  html: "<span></span>",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const officeIconActive = L.divIcon({
  className: "pochta-marker pochta-marker--active",
  html: "<span></span>",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

/* ── Nominatim address search ── */
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
interface NominatimResult { lat: string; lon: string; display_name: string; }

async function searchNominatim(query: string): Promise<NominatimResult[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({ q: query.trim(), format: "json", limit: "6", addressdetails: "0", countrycodes: "ru" });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "Accept-Language": "ru", "User-Agent": "CDsuicoreMap/1.0" },
  });
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d) ? d : [];
}

/* Типы отделений, которые не поддерживают расчёт тарифа посылки */
const PARCEL_UNSUPPORTED_TYPES = new Set(['АПС', 'ПОЧТОМАТ', 'POSTMAT', 'LOCKER']);

function isParcelUnsupported(o: { typeCode: string; address: string }): boolean {
  if (PARCEL_UNSUPPORTED_TYPES.has(o.typeCode.toUpperCase())) return true;
  const addr = o.address.toLowerCase();
  return addr.includes('апс') || addr.includes('почтомат') || addr.includes('постамат') || addr.includes('постомат');
}

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
  const officesRef = useRef<PochtaOffice[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const handleOfficeClickRef = useRef<(o: PochtaOffice) => void>(() => {});

  /* ── Toast ── */
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  /* ── Address search (Nominatim) ── */
  const [addrQuery, setAddrQuery] = useState("");
  const [addrResults, setAddrResults] = useState<NominatimResult[]>([]);
  const [showAddrDropdown, setShowAddrDropdown] = useState(false);
  const [addrLoading, setAddrLoading] = useState(false);
  const addrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAddrInput = (val: string) => {
    setAddrQuery(val);
    setShowAddrDropdown(true);
    if (addrTimerRef.current) clearTimeout(addrTimerRef.current);
    if (val.trim().length < 3) { setAddrResults([]); return; }
    addrTimerRef.current = setTimeout(async () => {
      setAddrLoading(true);
      try {
        const results = await searchNominatim(val);
        setAddrResults(results);
      } finally {
        setAddrLoading(false);
      }
    }, 350);
  };

  const pickAddrResult = (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    setAddrQuery(r.display_name.split(",").slice(0, 2).join(", "));
    setAddrResults([]);
    setShowAddrDropdown(false);
    mapRef.current?.setView([lat, lon], 15);
  };

  /* Init Leaflet map once */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [55.75, 37.62], zoom: 11, maxZoom: 19, zoomControl: false });
    L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      if (addrTimerRef.current) clearTimeout(addrTimerRef.current);
    };
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

  /* Держим officesRef актуальным */
  useEffect(() => { officesRef.current = offices; }, [offices]);

  const handleOfficeClick = useCallback(async (o: PochtaOffice) => {
    setSelectedOffice(o);
    setConfirmed(false);
    setTariff(null);
    setLoadingTariff(true);
    markersRef.current.forEach((m, code) => m.setIcon(code === o.postalCode ? officeIconActive : officeIcon));
    mapRef.current?.setView([o.latitude, o.longitude], Math.max(mapRef.current.getZoom(), 13));
    try {
      const { data, error } = await apiPochtaTariff(o.postalCode, diskCount);
      if (!error && data?.deliveryRub != null && data.deliveryRub > 0) {
        setTariff({ rub: data.deliveryRub, minDays: data.minDays, maxDays: data.maxDays });
      } else {
        // Тариф не посчитался — ищем следующее обычное ОПС
        const next = officesRef.current.find(
          (x) => x.postalCode !== o.postalCode && !isParcelUnsupported(x),
        );
        if (next) {
          showToast(`Это отделение не поддерживает доставку посылок. Переключаемся на ${next.postalCode}.`);
          handleOfficeClickRef.current(next);
        } else {
          setTariff({ rub: getDeliveryCostRub(o.settlement, null, diskCount), minDays: null, maxDays: null });
        }
      }
    } catch (e) {
      console.warn('[PochtaWidget] tariff exception:', e);
      setTariff({ rub: getDeliveryCostRub(o.settlement, null, diskCount), minDays: null, maxDays: null });
    } finally {
      setLoadingTariff(false);
    }
  }, [diskCount, showToast]);

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
      // Фильтруем постаматы/АПС — они не поддерживают расчёт тарифа посылки
      const filtered = data.filter((o) => !isParcelUnsupported(o));
      if (filtered.length === 0) {
        setFallbackMode(true);
        setFallbackTariff(getDeliveryCostRub(entry.city, [lat, lon], diskCount));
        setOffices([]);
        mapRef.current?.setView([lat, lon], 12);
        return;
      }
      setOffices(filtered);
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

      {/* Map — always in DOM so Leaflet tiles preload; hidden until city selected */}
      <div
        className={styles.mapSection}
        style={selectedCity && !fallbackMode
          ? undefined
          : { visibility: "hidden", height: 0, overflow: "hidden", margin: 0 }}
        ref={(el) => {
          // invalidateSize when becoming visible so tiles fill correctly
          if (el && selectedCity && !fallbackMode) {
            requestAnimationFrame(() => mapRef.current?.invalidateSize());
          }
        }}
      >
        {/* Address search inside map section */}
        {selectedCity && !fallbackMode && (
          <div className={styles.addrGroup}>
            <input
              type="text"
              className={styles.addrInput}
              placeholder="Поиск адреса на карте…"
              value={addrQuery}
              onChange={(e) => handleAddrInput(e.target.value)}
              onFocus={() => { if (addrResults.length > 0) setShowAddrDropdown(true); }}
              onBlur={() => setTimeout(() => setShowAddrDropdown(false), 150)}
              autoComplete="off"
            />
            {addrLoading && <span className={styles.spinnerSm} />}
            {showAddrDropdown && addrResults.length > 0 && (
              <ul className={styles.addrDropdown}>
                {addrResults.map((r, i) => (
                  <li key={i} className={styles.addrItem} onMouseDown={() => pickAddrResult(r)}>
                    {r.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
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

      {/* Toast — портал в body, позиция через CSS */}
      {toast && typeof document !== "undefined" && createPortal(
        <div className={styles.toast} role="status" aria-live="polite">
          {toast}
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setToast(null)}
            aria-label="Закрыть"
          >×</button>
        </div>,
        document.body,
      )}
    </div>
  );
}
