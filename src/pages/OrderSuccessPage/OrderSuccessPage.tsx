import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import * as api from "../../lib/api";
import styles from "./OrderSuccessPage.module.css";

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 15000;

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order");
  const { clearCart } = useCart();
  const [status, setStatus] = useState<"checking" | "paid" | "canceled" | "timeout" | "done">(
    orderId ? "checking" : "done"
  );

  useEffect(() => {
    if (!orderId) {
      clearCart();
      return;
    }
    let cancelled = false;
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    const poll = async () => {
      while (!cancelled && Date.now() < deadline) {
        const { data, error } = await api.apiGetOrderStatus(orderId);
        if (cancelled) return;
        if (!error && data?.status === "paid") {
          setStatus("paid");
          clearCart();
          return;
        }
        if (!error && data?.status === "canceled") {
          setStatus("canceled");
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      if (!cancelled) {
        setStatus("timeout");
        clearCart();
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [orderId, clearCart]);

  if (!orderId) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1 className={styles.title}>Оплата прошла успешно</h1>
          <p className={styles.text}>
            Спасибо за заказ. Мы обработаем его и отправим доставку на указанный ПВЗ.
          </p>
          <Link to="/profile?tab=orders" className={styles.link}>
            Перейти к моим заказам
          </Link>
        </div>
      </div>
    );
  }

  if (status === "checking") {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1 className={styles.title}>Проверяем оплату…</h1>
          <p className={styles.text}>Подождите несколько секунд.</p>
        </div>
      </div>
    );
  }

  if (status === "canceled") {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1 className={styles.title}>Оплата отменена</h1>
          <p className={styles.text}>
            Заказ сохранён. Вы можете оплатить его из раздела «Мои заказы».
          </p>
          <Link to="/profile?tab=orders" className={styles.link}>
            К моим заказам
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Оплата прошла успешно</h1>
        <p className={styles.text}>
          Спасибо за заказ. Мы обработаем его и отправим доставку на указанный ПВЗ.
        </p>
        <Link to="/profile?tab=orders" className={styles.link}>
          Перейти к моим заказам
        </Link>
      </div>
    </div>
  );
}
