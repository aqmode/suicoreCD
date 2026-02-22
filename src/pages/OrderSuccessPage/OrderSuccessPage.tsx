import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import styles from "./OrderSuccessPage.module.css";

export default function OrderSuccessPage() {
  const { clearCart } = useCart();
  useEffect(() => {
    clearCart();
  }, [clearCart]);

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
