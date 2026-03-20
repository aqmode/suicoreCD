import { useEffect, useRef, useState } from "react";
import styles from "./PochtaWidget.module.css";

const WIDGET_SCRIPT_URL = "https://widget.pochta.ru/map/widget/widget.js";
const WIDGET_ID = Number(import.meta.env.VITE_POCHTA_WIDGET_ID) || 61032;
const CONTAINER_ID = "ecom-widget-pochta";

export interface PochtaPoint {
  pvz_code: string;
  address: string;
  pvz_name: string;
  delivery_rub: number;
  /** Город из виджета (для нашего расчёта доставки) */
  city: string | null;
  /** Координаты [lat, lon] (для fallback расчёта) */
  coords: [number, number] | null;
}

declare global {
  interface Window {
    ecomStartWidget?: (opts: {
      id: number;
      callbackFunction: (pvzData: unknown) => void;
      containerId: string;
    }) => void;
  }
}

/** Формат данных виджета Почты России: indexTo, cashOfDelivery (в копейках), regionTo, cityTo, addressTo */
function normalizePvzData(data: unknown): PochtaPoint | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const index = [o.indexTo, o.index, o.postalCode].find((v) => v != null && String(v).trim()) as string | undefined;
  const pvz_code = index != null ? String(index).trim() : "";
  let delivery_rub = 0;
  const rawCost = o.cashOfDelivery ?? o.cashservice ?? o.paySum ?? 0;
  if (typeof rawCost === "number" && rawCost > 0) delivery_rub = Math.round(rawCost / 100);
  else if (typeof rawCost === "string") {
    const n = parseFloat(rawCost.replace(/\s/g, "").replace(",", "."));
    if (!Number.isNaN(n) && n > 0) delivery_rub = Math.round(n / 100);
  }
  const addressParts = [o.regionTo, o.cityTo, o.addressTo].filter((v) => v != null && String(v).trim());
  const address = addressParts.length > 0 ? addressParts.join(", ") : (o.addressTo != null ? String(o.addressTo) : "") || (o.address != null ? String(o.address) : "");
  const pvz_name = (o.name != null && String(o.name).trim()) ? String(o.name).trim() : "Почта России";

  // Город
  const cityRaw = o.cityTo ?? o.city ?? null;
  const city = cityRaw != null && String(cityRaw).trim() ? String(cityRaw).trim() : null;

  // Координаты
  let coords: [number, number] | null = null;
  const lat = Number(o.latitude ?? o.lat ?? 0);
  const lon = Number(o.longitude ?? o.lng ?? o.lon ?? 0);
  if (lat !== 0 && lon !== 0 && !Number.isNaN(lat) && !Number.isNaN(lon)) {
    coords = [lat, lon];
  }

  if (!address && !pvz_code) return null;
  return {
    pvz_code: pvz_code || "—",
    address: address || "—",
    pvz_name,
    delivery_rub,
    city,
    coords,
  };
}

interface Props {
  onSelect: (point: PochtaPoint) => void;
}

export default function PochtaWidget({ onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [widgetFailed, setWidgetFailed] = useState(false);
  const [manualCity, setManualCity] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualIndex, setManualIndex] = useState("");

  useEffect(() => {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    const win = window as unknown as Record<string, (data: unknown) => void>;
    win.pochtaCallbackFunction = (pvzData: unknown) => {
      const point = normalizePvzData(pvzData);
      if (point) onSelectRef.current(point);
    };

    let widgetTimeout: ReturnType<typeof setTimeout>;

    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT_URL;
    script.async = false;
    script.onload = () => {
      if (window.ecomStartWidget) {
        window.ecomStartWidget({
          id: WIDGET_ID,
          containerId: CONTAINER_ID,
          callbackFunction: win.pochtaCallbackFunction!,
        });
        // Если виджет не загрузил iframe за 8 сек — показываем ручной ввод
        widgetTimeout = setTimeout(() => {
          const iframe = container.querySelector("iframe");
          if (!iframe) setWidgetFailed(true);
        }, 8000);
      } else {
        setWidgetFailed(true);
      }
    };
    script.onerror = () => setWidgetFailed(true);
    document.body.appendChild(script);
    return () => {
      clearTimeout(widgetTimeout);
      script.remove();
      delete win.pochtaCallbackFunction;
    };
  }, []);

  const handleManualSubmit = () => {
    const city = manualCity.trim();
    const address = manualAddress.trim();
    if (!city || !address) return;
    onSelectRef.current({
      pvz_code: manualIndex.trim() || "—",
      address: `${city}, ${address}`,
      pvz_name: "Почта России",
      delivery_rub: 0,
      city,
      coords: null,
    });
  };

  return (
    <div className={styles.wrapper}>
      <div
        id={CONTAINER_ID}
        ref={containerRef}
        className={styles.container}
        style={{ height: widgetFailed ? 0 : 500, overflow: "hidden" }}
      />
      {widgetFailed && (
        <div className={styles.fallback}>
          <p className={styles.fallbackHint}>
            Виджет Почты России недоступен. Введите адрес вручную:
          </p>
          <input
            type="text"
            className={styles.fallbackInput}
            placeholder="Город (напр. Москва)"
            value={manualCity}
            onChange={(e) => setManualCity(e.target.value)}
          />
          <input
            type="text"
            className={styles.fallbackInput}
            placeholder="Адрес отделения или полный адрес"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
          />
          <input
            type="text"
            className={styles.fallbackInput}
            placeholder="Индекс (необязательно)"
            value={manualIndex}
            onChange={(e) => setManualIndex(e.target.value)}
          />
          <button
            type="button"
            className={styles.fallbackBtn}
            onClick={handleManualSubmit}
            disabled={!manualCity.trim() || !manualAddress.trim()}
          >
            Подтвердить адрес
          </button>
        </div>
      )}
    </div>
  );
}
