import { useState, useRef, useCallback, useEffect } from "react";
import { apiPochtaCleanAddress, apiPochtaTariff } from "../../lib/api";
import { getDeliveryCostRub } from "../../lib/delivery";
import styles from "./PochtaWidget.module.css";

export interface PochtaPoint {
  pvz_code: string;
  address: string;
  pvz_name: string;
  delivery_rub: number;
  city: string | null;
  coords: [number, number] | null;
  /** Срок доставки (текст) */
  deliveryDays: string | null;
}

interface Props {
  onSelect: (point: PochtaPoint) => void;
  diskCount?: number;
}

export default function PochtaWidget({ onSelect, diskCount = 1 }: Props) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    index: string;
    place: string;
    region: string;
    deliveryRub: number;
    minDays: number | null;
    maxDays: number | null;
    fullAddress: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const lookupAddress = useCallback(async (addr: string) => {
    if (addr.trim().length < 5) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setConfirmed(false);
    try {
      const { data: clean, error: cleanErr } = await apiPochtaCleanAddress(addr);
      if (cleanErr || !clean?.index) {
        const cityMatch = addr.match(/^([^,]+)/);
        const city = cityMatch?.[1]?.trim() || null;
        const fallbackRub = getDeliveryCostRub(city, null, diskCount);
        setResult({
          index: "—",
          place: city || "—",
          region: "—",
          deliveryRub: fallbackRub,
          minDays: null,
          maxDays: null,
          fullAddress: addr,
        });
        setLoading(false);
        return;
      }
      const place = clean.place || "—";
      const region = clean.region || "—";
      const idx = clean.index;

      const { data: tariff } = await apiPochtaTariff(idx, diskCount);
      let deliveryRub: number;
      let minDays: number | null = null;
      let maxDays: number | null = null;

      if (tariff?.deliveryRub) {
        deliveryRub = tariff.deliveryRub;
        minDays = tariff.minDays;
        maxDays = tariff.maxDays;
      } else {
        deliveryRub = getDeliveryCostRub(place, null, diskCount);
      }
      setResult({ index: idx, place, region, deliveryRub, minDays, maxDays, fullAddress: addr });
    } catch {
      setError("Не удалось рассчитать доставку. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }, [diskCount]);

  const handleAddressChange = (val: string) => {
    setAddress(val);
    setConfirmed(false);
    clearTimeout(debounceRef.current);
    if (val.trim().length >= 5) {
      debounceRef.current = setTimeout(() => lookupAddress(val), 800);
    } else {
      setResult(null);
      setError(null);
    }
  };

  useEffect(() => {
    if (result && address.trim().length >= 5) {
      lookupAddress(address);
    }
  }, [diskCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = () => {
    if (!result) return;
    setConfirmed(true);
    const daysText = result.minDays != null && result.maxDays != null
      ? `${result.minDays}–${result.maxDays} дн.`
      : result.maxDays != null
        ? `до ${result.maxDays} дн.`
        : null;
    onSelectRef.current({
      pvz_code: result.index,
      address: result.fullAddress,
      pvz_name: "Почта России",
      delivery_rub: result.deliveryRub,
      city: result.place,
      coords: null,
      deliveryDays: daysText,
    });
  };

  const formatDays = () => {
    if (!result) return "";
    if (result.minDays != null && result.maxDays != null) {
      return result.minDays === result.maxDays
        ? `${result.minDays} дн.`
        : `${result.minDays}–${result.maxDays} дн.`;
    }
    if (result.maxDays != null) return `до ${result.maxDays} дн.`;
    return "";
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputGroup}>
        <input
          type="text"
          className={styles.addressInput}
          placeholder="Город, улица, дом (напр. Москва, Тверская 1)"
          value={address}
          onChange={(e) => handleAddressChange(e.target.value)}
          aria-label="Адрес доставки"
        />
        {loading && <span className={styles.spinner} />}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {result && (
        <div className={styles.resultCard}>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Город / регион:</span>
            <span className={styles.resultValue}>{result.place}{result.region !== result.place ? `, ${result.region}` : ""}</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Индекс:</span>
            <span className={styles.resultValue}>{result.index}</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Стоимость доставки:</span>
            <span className={`${styles.resultValue} ${styles.price}`}>{result.deliveryRub} ₽</span>
          </div>
          {formatDays() && (
            <div className={styles.resultRow}>
              <span className={styles.resultLabel}>Срок:</span>
              <span className={styles.resultValue}>{formatDays()}</span>
            </div>
          )}
          {diskCount > 1 && (
            <p className={styles.diskHint}>Расчёт для {diskCount} дисков</p>
          )}
          {!confirmed ? (
            <button type="button" className={styles.confirmBtn} onClick={handleConfirm}>
              Подтвердить адрес
            </button>
          ) : (
            <p className={styles.confirmedText}>✓ Адрес подтверждён</p>
          )}
        </div>
      )}

      <p className={styles.hint}>
        Введите полный адрес — стоимость и сроки доставки рассчитаются автоматически.
        Доставка Почтой России из Казани.
      </p>
    </div>
  );
}
