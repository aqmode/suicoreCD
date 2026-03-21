import { useState, useRef, useCallback, useEffect, useMemo } from "react";
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

const SCRIPT_ID = "yandex-maps-api-pochta";
const MAP_ID = "pochta-map-root";

/* ── Helpers ── */
function loadYmaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.ymaps) { window.ymaps.ready(() => resolve()); return; }
    if (document.getElementById(SCRIPT_ID)) {
      const wait = () => {
        if (window.ymaps) window.ymaps.ready(() => resolve());
        else setTimeout(wait, 100);
      };
      wait();
      return;
    }
    const key = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
    if (!key) { reject(new Error("No VITE_YANDEX_MAPS_API_KEY")); return; }
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
    s.async = true;
    s.onload = () => window.ymaps!.ready(() => resolve());
    s.onerror = () => reject(new Error("ymaps script failed"));
    document.head.appendChild(s);
  });
}

function distanceLabel(m: number): string {
  return m < 1000 ? `${m} м` : `${(m / 1000).toFixed(1)} км`;
}

/* ══════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════ */
export default function PochtaWidget({ onSelect, diskCount = 1 }: Props) {
  /* ── Cities list ── */
  const [cities, setCities] = useState<CityEntry[]>([]);
  useEffect(() => {
    fetch("/cities.json").then((r) => r.json()).then((d) => setCities(d)).catch(() => {});
  }, []);

  /* ── City search / autocomplete ── */
  const [cityQuery, setCityQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityEntry | null>(null);

  const suggestions = useMemo(() => {
    if (!cityQuery.trim() || cityQuery.length < 2) return [];
    const q = cityQuery.toLowerCase();
    return cities.filter((c) => c.city.toLowerCase().includes(q)).slice(0, 8);
  }, [cityQuery, cities]);

  /* ── Offices ── */
  const [offices, setOffices] = useState<PochtaOffice[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [officesError, setOfficesError] = useState<string | null>(null);

  /* ── Selected office + tariff ── */
  const [selectedOffice, setSelectedOffice] = useState<PochtaOffice | null>(null);
  const [tariff, setTariff] = useState<{ rub: number; minDays: number | null; maxDays: number | null } | null>(null);
  const [loadingTariff, setLoadingTariff] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  /* ── Map ── */
  const mapRef = useRef<InstanceType<NonNullable<typeof window.ymaps>["Map"]> | null>(null);
  const mapReady = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  /* ── Click an office (defined before pickCity so it can be referenced) ── */
  const handleOfficeClick = useCallback(async (o: PochtaOffice) => {
    setSelectedOffice(o);
    setConfirmed(false);
    setTariff(null);
    setLoadingTariff(true);
    try {
      const { data } = await apiPochtaTariff(o.postalCode, diskCount);
      if (data?.deliveryRub) {
        setTariff({ rub: data.deliveryRub, minDays: data.minDays, maxDays: data.maxDays });
      } else {
        const fallback = getDeliveryCostRub(o.settlement, null, diskCount);
        setTariff({ rub: fallback, minDays: null, maxDays: null });
      }
    } catch {
      const fallback = getDeliveryCostRub(o.settlement, null, diskCount);
      setTariff({ rub: fallback, minDays: null, maxDays: null });
    } finally {
      setLoadingTariff(false);
    }
  }, [diskCount]);

  /* ── Pick a city ── */
  const handleOfficeClickRef = useRef(handleOfficeClick);
  handleOfficeClickRef.current = handleOfficeClick;

  const pickCity = useCallback(async (entry: CityEntry) => {
    setSelectedCity(entry);
    setCityQuery(entry.city);
    setShowSuggestions(false);
    setSelectedOffice(null);
    setTariff(null);
    setConfirmed(false);
    setOfficesError(null);

    const [lat, lon] = entry.coordinates.split(",").map((s) => parseFloat(s.trim()));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    setLoadingOffices(true);
    try {
      const { data, error } = await apiPochtaNearby(lat, lon, 40);
      if (error || !data || data.length === 0) {
        setOfficesError("Не найдено отделений рядом с этим городом");
        setOffices([]);
        return;
      }
      setOffices(data);

      // Init / update map
      try {
        await loadYmaps();
        if (!mapReady.current) {
          const map = new window.ymaps!.Map(MAP_ID, { center: [lat, lon], zoom: 12 });
          mapRef.current = map;
          mapReady.current = true;
        } else {
          mapRef.current!.geoObjects.removeAll();
          mapRef.current!.setCenter([lat, lon], 12);
        }
        data.forEach((o) => {
          const pm = new window.ymaps!.Placemark(
            [o.latitude, o.longitude],
            {
              hintContent: `${o.postalCode} — ${o.address}`,
              balloonContent: `<b>${o.postalCode}</b><br/>${o.address}<br/>${distanceLabel(o.distance)}`,
            },
            { preset: "islands#redCircleIcon" },
          );
          pm.events.add("click", () => handleOfficeClickRef.current(o));
          mapRef.current!.geoObjects.add(pm);
        });
        if (data.length > 1) {
          const lats = data.map((o) => o.latitude);
          const lons = data.map((o) => o.longitude);
          mapRef.current!.setBounds(
            [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]],
            { checkZoomRange: true },
          );
        }
      } catch {
        // map init not critical
      }
    } catch {
      setOfficesError("Ошибка загрузки отделений");
    } finally {
      setLoadingOffices(false);
    }
  }, []);

  /* ── Re-calc tariff when diskCount changes ── */
  useEffect(() => {
    if (selectedOffice) handleOfficeClick(selectedOffice);
  }, [diskCount]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Confirm ── */
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

  /* ── Cleanup map on unmount ── */
  useEffect(() => {
    return () => {
      if (mapRef.current) { mapRef.current.destroy(); mapRef.current = null; mapReady.current = false; }
    };
  }, []);

  const daysLabel = tariff
    ? tariff.minDays != null && tariff.maxDays != null
      ? tariff.minDays === tariff.maxDays ? `${tariff.minDays} дн.` : `${tariff.minDays}–${tariff.maxDays} дн.`
      : tariff.maxDays != null ? `до ${tariff.maxDays} дн.` : ""
    : "";

  return (
    <div className={styles.wrapper}>
      {/* City input */}
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

      {officesError && <p className={styles.error}>{officesError}</p>}

      {/* Map */}
      {selectedCity && (
        <div className={styles.mapSection}>
          <div id={MAP_ID} className={styles.mapContainer} />
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
        Выберите город — на карте появятся ближайшие почтовые отделения.
        Нажмите на отделение для расчёта стоимости и сроков доставки из Казани.
      </p>
    </div>
  );
}
