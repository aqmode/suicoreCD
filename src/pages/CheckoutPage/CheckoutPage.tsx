import { useState, useEffect, useCallback, type FormEvent } from "react";
import PhoneInput from "react-phone-number-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import ru from "react-phone-number-input/locale/ru.json";
import "react-phone-number-input/style.css";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import * as api from "../../lib/api";
import { formatRub } from "../../lib/prices";
import { isValidFullName, fullNameError } from "../../lib/validation";
import PochtaWidget, { type PochtaPoint } from "../../components/PochtaWidget/PochtaWidget";
import styles from "./CheckoutPage.module.css";

const PAYMENT_TIP_COOKIE = "suicore_payment_tip_seen";
const MAP_TIP_COOKIE = "suicore_map_tip_seen";
const ONE_RUBLE_DELIVERY = !!(import.meta.env.VITE_PRICE_1RUB_NAME as string)?.trim();
const ABROAD_DELIVERY_RUB = 1525;
const RF_DELIVERY_SURCHARGE_RUB = 100;

function getPaymentTipSeen(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie.split(";").some((s) => s.trim().startsWith(`${PAYMENT_TIP_COOKIE}=`));
}

function setPaymentTipSeen(): void {
  try {
    document.cookie = `${PAYMENT_TIP_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

function getMapTipSeen(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie.split(";").some((s) => s.trim().startsWith(`${MAP_TIP_COOKIE}=`));
}

function setMapTipSeen(): void {
  try {
    document.cookie = `${MAP_TIP_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export default function CheckoutPage() {
  const { user, signInWithGoogle } = useAuth();
  const { items, totalRub } = useCart();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agreePersonalData, setAgreePersonalData] = useState(false);
  const [pochtaPoint, setPochtaPoint] = useState<PochtaPoint | null>(null);
  const [abroadCountry, setAbroadCountry] = useState<string | null>(null);
  const [abroadOpen, setAbroadOpen] = useState(false);
  const [abroadSearch, setAbroadSearch] = useState("");
  const [countries, setCountries] = useState<{ id: number; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [paymentTipOpen, setPaymentTipOpen] = useState(false);
  const [abroadConfirmOpen, setAbroadConfirmOpen] = useState(false);
  const [abroadConfirmSeen, setAbroadConfirmSeen] = useState(false);
  const [mapTipVisible, setMapTipVisible] = useState(false);

  const deliveryRub = abroadCountry
    ? ABROAD_DELIVERY_RUB
    : ONE_RUBLE_DELIVERY
      ? (pochtaPoint ? 1 + RF_DELIVERY_SURCHARGE_RUB : 0)
      : pochtaPoint
        ? pochtaPoint.delivery_rub + RF_DELIVERY_SURCHARGE_RUB
        : 0;
  const totalWithDelivery = totalRub + deliveryRub;

  const fullNameValid = isValidFullName(fullName);
  const fullNameErr = fullName.trim() ? fullNameError(fullName) : null;
  const phoneValid = !!phone && isValidPhoneNumber(phone);
  const hasDelivery = !!(pochtaPoint || abroadCountry);
  const canSubmit =
    items.length > 0 &&
    fullNameValid &&
    phoneValid &&
    agreePersonalData &&
    hasDelivery;

  const handlePochtaSelect = useCallback((point: PochtaPoint) => {
    setPochtaPoint(point);
    setAbroadCountry(null);
  }, []);

  const handleAbroadCountrySelect = useCallback((name: string) => {
    setAbroadCountry(name);
    setPochtaPoint(null);
  }, []);

  useEffect(() => {
    if (!abroadOpen || countries.length > 0) return;
    fetch("/countries.json")
      .then((r) => r.json())
      .then(setCountries)
      .catch(() => setCountries([]));
  }, [abroadOpen, countries.length]);

  useEffect(() => {
    if (!getMapTipSeen()) setMapTipVisible(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.email) setEmail(user.email);
    const loadProfile = async () => {
      const { data } = await api.apiGetProfile();
      if (data?.phone) setPhone(String(data.phone));
    };
    loadProfile();
  }, [user]);

  const doPayment = useCallback(async () => {
    if (!getPaymentTipSeen()) {
      setPaymentTipSeen();
      setPaymentTipOpen(true);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data: order, error: orderErr } = await api.apiCreateOrder({
        customer_name: fullName.trim(),
        customer_phone: phone,
        customer_email: email.trim(),
        delivery_address: abroadCountry ?? pochtaPoint?.address ?? null,
        pvz_code: pochtaPoint?.pvz_code ?? null,
        pvz_name: pochtaPoint?.pvz_name ?? null,
        total_rub: totalWithDelivery,
        status: "new",
        items: items.map((i) => ({
          release_id: i.release_id,
          release_name: i.release_name,
          cover_url: i.cover_url,
          price_rub: i.price_rub,
          quantity: i.quantity,
          track_id: i.track_id ?? null,
          track_name: i.track_name ?? null,
        })),
      });
      if (orderErr || !order?.id) throw new Error(orderErr?.message ?? "Ошибка создания заказа");
      const orderId = (order as { id: string }).id;
      const { data: payment, error: payErr } = await api.apiCreatePayment(orderId, totalWithDelivery);
      if (payErr || !payment?.payUrl) {
        setSubmitError(
          payErr?.message ?? "Не удалось перейти к оплате. Заказ создан — можно оплатить его из раздела «Мои заказы»."
        );
        return;
      }
      window.location.href = payment.payUrl;
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Ошибка оформления");
    } finally {
      setSubmitting(false);
    }
  }, [
    fullName,
    phone,
    email,
    abroadCountry,
    pochtaPoint,
    totalWithDelivery,
    items,
  ]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!user) return;
    setSubmitAttempted(true);
    if (!canSubmit) return;
    if (abroadCountry && !abroadConfirmSeen) {
      setAbroadConfirmOpen(true);
      return;
    }
    await doPayment();
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Оформление заказа</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Получатель</h2>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fullName">
                ФИО получателя
              </label>
              <input
                id="fullName"
                type="text"
                className={fullNameErr || (submitAttempted && !fullNameValid) ? `${styles.input} ${styles.inputError}` : styles.input}
                placeholder="Иванов Иван Иванович"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                aria-invalid={!!fullNameErr || (submitAttempted && !fullNameValid)}
                aria-describedby={fullNameErr || (submitAttempted && !fullNameValid) ? "fullName-error" : undefined}
              />
              {(fullNameErr || (submitAttempted && !fullNameValid)) && (
                <span id="fullName-error" className={styles.fieldError} role="alert">
                  {fullNameErr || (fullName.trim() ? fullNameError(fullName) : "Введите ФИО получателя")}
                </span>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="phone">
                Номер телефона
              </label>
              <PhoneInput
                international
                defaultCountry="RU"
                labels={ru}
                placeholder="Введите номер"
                value={phone || undefined}
                onChange={(v) => setPhone(v ?? "")}
                className={(!phoneValid && (phone || submitAttempted)) ? `${styles.phoneWrap} ${styles.inputError}` : styles.phoneWrap}
                numberInputProps={{
                  id: "phone",
                  className: styles.phoneInput,
                  "aria-invalid": !!phone && !phoneValid,
                  "aria-describedby": phone && !phoneValid ? "phone-error" : undefined,
                }}
              />
              {(phone || submitAttempted) && !phoneValid && (
                <span id="phone-error" className={styles.fieldError} role="alert">
                  {!phone ? "Введите номер телефона" : "Введите корректный номер телефона"}
                </span>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className={submitAttempted && !email.trim() ? `${styles.input} ${styles.inputError}` : styles.input}
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={submitAttempted && !email.trim()}
                aria-describedby={submitAttempted && !email.trim() ? "email-error" : undefined}
              />
              {submitAttempted && !email.trim() && (
                <span id="email-error" className={styles.fieldError} role="alert">
                  Введите email
                </span>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Доставка Почтой России</h2>
            <p className={styles.hint}>Выберите отделение на карте</p>
            <div className={styles.mapWrap}>
              <PochtaWidget onSelect={handlePochtaSelect} />
              {mapTipVisible && (
                <div
                  className={styles.mapTipOverlay}
                  role="dialog"
                  aria-modal="false"
                  aria-labelledby="map-tip-title"
                >
                  <p id="map-tip-title" className={styles.mapTipText}>
                    Если точки ПВЗ не отображаются на карте, отключите VPN, прокси или блокировщики (например Zapret).
                  </p>
                  <button
                    type="button"
                    className={styles.mapTipClose}
                    onClick={() => {
                      setMapTipSeen();
                      setMapTipVisible(false);
                    }}
                    autoFocus
                  >
                    Понятно
                  </button>
                </div>
              )}
            </div>
            {submitAttempted && !hasDelivery && (
              <p className={styles.fieldError} role="alert">
                Выберите отделение на карте или страну доставки ниже
              </p>
            )}
            {pochtaPoint && (
              <div className={styles.pvzInfo}>
                <div className={styles.pvzRow}>
                  <span className={styles.pvzLabel}>Код ОПС:</span>
                  <span className={styles.pvzValue}>{pochtaPoint.pvz_code}</span>
                </div>
                <div className={styles.pvzRow}>
                  <span className={styles.pvzLabel}>Адрес:</span>
                  <span className={styles.pvzValue}>{pochtaPoint.address}</span>
                </div>
                <div className={styles.pvzRow}>
                  <span className={styles.pvzLabel}>Стоимость доставки:</span>
                  <span className={styles.pvzValue}>{formatRub(deliveryRub)}</span>
                </div>
              </div>
            )}

            <div className={styles.abroadWrap}>
              <button
                type="button"
                className={`${styles.abroadToggle} ${abroadOpen ? styles.abroadToggleOpen : ''}`}
                onClick={() => setAbroadOpen((o) => !o)}
                aria-expanded={abroadOpen}
              >
                <span className={styles.abroadToggleText}>Я не из РФ</span>
                <span className={styles.abroadToggleIcon} aria-hidden>▼</span>
              </button>
              {abroadOpen && (
                <div className={styles.abroadPanel}>
                  <input
                    type="text"
                    className={styles.abroadSearch}
                    placeholder="Поиск страны..."
                    value={abroadSearch}
                    onChange={(e) => setAbroadSearch(e.target.value)}
                    aria-label="Поиск страны"
                  />
                  <ul className={styles.abroadList} role="listbox">
                    {countries
                      .filter((c) =>
                        c.name.toLowerCase().includes(abroadSearch.trim().toLowerCase())
                      )
                      .map((c) => (
                        <li
                          key={c.id}
                          role="option"
                          aria-selected={abroadCountry === c.name}
                          className={`${styles.abroadItem} ${abroadCountry === c.name ? styles.abroadItemSelected : ''}`}
                          onClick={() => handleAbroadCountrySelect(c.name)}
                        >
                          {c.name}
                        </li>
                      ))}
                  </ul>
                  {abroadCountry && (
                    <p className={styles.abroadSelected}>
                      Доставка в {abroadCountry}: {formatRub(ABROAD_DELIVERY_RUB)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={styles.totals}>
            <div className={styles.totalsRow}>
              <span className={styles.totalsLabel}>Товары</span>
              <span className={styles.totalsValue}>{formatRub(totalRub)}</span>
            </div>
            <div className={styles.totalsRow}>
              <span className={styles.totalsLabel}>
                Доставка{deliveryRub === 0 ? " (тестовый заказ — без доставки)" : ""}
              </span>
              <span className={styles.totalsValue}>{formatRub(deliveryRub)}</span>
            </div>
            <div className={styles.totalsRowTotal}>
              <span className={styles.totalsLabel}>Итого</span>
              <span className={styles.totalsValue}>{formatRub(totalWithDelivery)}</span>
            </div>
          </div>

          <label className={styles.agreeLabel}>
            <input
              type="checkbox"
              checked={agreePersonalData}
              onChange={(e) => setAgreePersonalData(e.target.checked)}
              className={styles.checkbox}
              aria-describedby="agree-hint"
            />
            <span id="agree-hint" className={styles.agreeText}>
              Я соглашаюсь с{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className={styles.agreeLink}>
                политикой обработки персональных данных
              </a>{' '}
              и{' '}
              <a href="/offer" target="_blank" rel="noopener noreferrer" className={styles.agreeLink}>
                офертой
              </a>.
            </span>
          </label>
          {submitAttempted && !agreePersonalData && (
            <p className={styles.fieldError} role="alert">
              Необходимо согласие с политикой и офертой.
            </p>
          )}
          {submitError && <p className={styles.submitError}>{submitError}</p>}
          {user ? (
            <button
              type="submit"
              className={styles.orderBtn}
              disabled={submitting}
            >
              {submitting ? "Переход к оплате…" : "Оплатить"}
            </button>
          ) : (
            <button
              type="button"
              className={styles.orderBtn}
              onClick={() => signInWithGoogle()}
            >
              Войти
            </button>
          )}
        </form>
      </div>

      {abroadConfirmOpen && (
        <div
          className={styles.tipOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="abroad-confirm-title"
        >
          <div className={styles.tipModal} onClick={(ev) => ev.stopPropagation()}>
            <h2 id="abroad-confirm-title" className={styles.tipTitle}>
              Доставка за рубеж
            </h2>
            <p className={styles.tipText}>
              Свяжитесь с администратором сайта для доставки посылки.
            </p>
            <p className={styles.tipText}>
              <a
                href="https://t.me/suicoree"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.abroadConfirmLink}
              >
                t.me/suicoree
              </a>
            </p>
            <button
              type="button"
              className={styles.tipClose}
              onClick={() => {
                setAbroadConfirmOpen(false);
                setAbroadConfirmSeen(true);
                doPayment();
              }}
              autoFocus
            >
              Хорошо
            </button>
          </div>
        </div>
      )}

      {paymentTipOpen && (
        <div
          className={styles.tipOverlay}
          onClick={() => setPaymentTipOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-tip-title"
        >
          <div className={styles.tipModal} onClick={(ev) => ev.stopPropagation()}>
            <h2 id="payment-tip-title" className={styles.tipTitle}>
              Если у вас проблемы с оплатой
            </h2>
            <p className={styles.tipText}>
              Если страница не грузится или оплата не проходит, попробуйте:
            </p>
            <ul className={styles.tipList}>
              <li>выключить Zapret;</li>
              <li>отключить прокси или VPN;</li>
              <li>перезагрузить страницу (Ctrl+F5).</li>
            </ul>
            <p className={styles.tipTextAfter}>
              После этого можно снова нажать «Оплатить».
            </p>
            <button
              type="button"
              className={styles.tipClose}
              onClick={() => setPaymentTipOpen(false)}
              autoFocus
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
