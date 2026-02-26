import { useEffect, useRef } from "react";
import styles from "./PochtaWidget.module.css";

const WIDGET_SCRIPT_URL = "https://widget.pochta.ru/map/widget/widget.js";
const WIDGET_ID = Number(import.meta.env.VITE_POCHTA_WIDGET_ID) || 61032;
const CONTAINER_ID = "ecom-widget-pochta";

export interface PochtaPoint {
  pvz_code: string;
  address: string;
  pvz_name: string;
  delivery_rub: number;
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
  if (!address && !pvz_code) return null;
  return {
    pvz_code: pvz_code || "—",
    address: address || "—",
    pvz_name,
    delivery_rub,
  };
}

interface Props {
  onSelect: (point: PochtaPoint) => void;
}

export default function PochtaWidget({ onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    const win = window as unknown as Record<string, (data: unknown) => void>;
    win.pochtaCallbackFunction = (pvzData: unknown) => {
      const point = normalizePvzData(pvzData);
      if (point) onSelectRef.current(point);
    };

    // Виджет тянет jQuery с yandex.st (часто ERR_CONNECTION_CLOSED). Даём свой $ до вставки скрипта.
    const runWidget = () => {
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
        }
      };
      document.body.appendChild(script);
    };

    let cancelled = false;
    if ((win as { $?: unknown }).$ != null) {
      runWidget();
    } else {
      import("jquery").then((mod) => {
        if (cancelled) return;
        const $ = mod.default;
        (win as { $: typeof $; jQuery: typeof $ }).$ = (win as { jQuery: typeof $ }).jQuery = $;
        runWidget();
      });
    }

    return () => {
      cancelled = true;
      const script = document.querySelector(`script[src="${WIDGET_SCRIPT_URL}"]`);
      if (script) script.remove();
      delete win.pochtaCallbackFunction;
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      <div
        id={CONTAINER_ID}
        ref={containerRef}
        className={styles.container}
        style={{ height: 500 }}
      />
    </div>
  );
}
