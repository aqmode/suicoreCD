import { Link } from "react-router-dom";
import styles from "./OrderFailPage.module.css";

export default function OrderFailPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Оплата не выполнена</h1>
        <p className={styles.text}>
          Оплата была отменена или не прошла. Заказ сохранён — вы можете вернуться и оплатить его из раздела «Мои заказы».
        </p>
        <Link to="/profile?tab=orders" className={styles.link}>
          К моим заказам
        </Link>
        <span className={styles.sep}> </span>
        <Link to="/checkout" className={styles.linkSecondary}>
          Оформить заново
        </Link>
      </div>
    </div>
  );
}
