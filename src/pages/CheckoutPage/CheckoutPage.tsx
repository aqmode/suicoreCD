import { useState, useEffect, useCallback, type FormEvent } from "react";
import PhoneInput from "react-phone-number-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import ru from "react-phone-number-input/locale/ru.json";
import "react-phone-number-input/style.css";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import * as api from "../../lib/api";
import { getDeliveryCostRub } from "../../lib/delivery";
import { formatRub } from "../../lib/prices";
import { isValidFullName, fullNameError } from "../../lib/validation";
import DeliveryMap, { type DeliveryMapPoint } from "../../components/DeliveryMap/DeliveryMap";
import styles from "./CheckoutPage.module.css";

export default function CheckoutPage() {
  const { user, signInWithGoogle } = useAuth();
  const { items, totalRub } = useCart();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agreePersonalData, setAgreePersonalData] = useState(false);
  const [mapPoint, setMapPoint] = useState<DeliveryMapPoint | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const deliveryRub = getDeliveryCostRub(mapPoint?.coords ?? null);
  const totalWithDelivery = totalRub + deliveryRub;

  const fullNameValid = isValidFullName(fullName);
  const fullNameErr = fullName.trim() ? fullNameError(fullName) : null;
  const phoneValid = !!phone && isValidPhoneNumber(phone);
  const canSubmit =
    items.length > 0 &&
    fullNameValid &&
    phoneValid &&
    agreePersonalData &&
    !!mapPoint;

  const handleMapSelect = useCallback((point: DeliveryMapPoint) => {
    setMapPoint(point);
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!user) return;
    setSubmitAttempted(true);
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data: order, error: orderErr } = await api.apiCreateOrder({
        customer_name: fullName.trim(),
        customer_phone: phone,
        customer_email: email.trim(),
        delivery_address: mapPoint?.address ?? null,
        pvz_code: mapPoint?.code ?? null,
        pvz_name: mapPoint?.name ?? null,
        total_rub: totalWithDelivery,
        status: "new",
        items: items.map((i) => ({
          release_id: i.release_id,
          release_name: i.release_name,
          cover_url: i.cover_url,
          price_rub: i.price_rub,
          quantity: i.quantity,
        })),
      });
      if (orderErr || !order?.id) throw new Error(orderErr?.message ?? "Ошибка создания заказа");
      const invId = Number((order as { inv_id?: number }).inv_id);
      if (Number.isNaN(invId) || invId < 1) throw new Error("Нет номера счёта для оплаты. Перезапустите сервер после миграции БД.");
      const { data: payment, error: payErr } = await api.apiCreatePayment(invId, totalWithDelivery);
      if (payErr || !payment?.payUrl) throw new Error(payErr?.message ?? "Ошибка создания ссылки на оплату");
      window.location.href = payment.payUrl;
      return;
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Ошибка оформления");
    } finally {
      setSubmitting(false);
    }
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
                inputClassName={styles.phoneInput}
                numberInputProps={{
                  id: "phone",
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
            <h2 className={styles.sectionTitle}>Точка на карте</h2>
            <p className={styles.hint}>Выберите ПВЗ СДЭК на карте</p>
            <DeliveryMap onSelect={handleMapSelect} selectedPoint={mapPoint} />
            {submitAttempted && !mapPoint && (
              <p className={styles.fieldError} role="alert">
                Выберите ПВЗ на карте
              </p>
            )}
            {mapPoint && (
              <div className={styles.pvzInfo}>
                {mapPoint.code != null && mapPoint.code !== "" && (
                  <div className={styles.pvzRow}>
                    <span className={styles.pvzLabel}>Код ПВЗ:</span>
                    <span className={styles.pvzValue}>{mapPoint.code}</span>
                  </div>
                )}
                <div className={styles.pvzRow}>
                  <span className={styles.pvzLabel}>Адрес:</span>
                  <span className={styles.pvzValue}>{mapPoint.address}</span>
                </div>
                <div className={styles.pvzRow}>
                  <span className={styles.pvzLabel}>Координаты:</span>
                  <span className={styles.pvzValue}>{mapPoint.coords[0].toFixed(5)}, {mapPoint.coords[1].toFixed(5)}</span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.totals}>
            <div className={styles.totalsRow}>
              <span className={styles.totalsLabel}>Товары</span>
              <span className={styles.totalsValue}>{formatRub(totalRub)}</span>
            </div>
            <div className={styles.totalsRow}>
              <span className={styles.totalsLabel}>Доставка</span>
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
    </div>
  );
}
