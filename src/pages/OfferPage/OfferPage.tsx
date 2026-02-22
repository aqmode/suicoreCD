import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./OfferPage.module.css";

export default function OfferPage() {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    setLeaving(true);
    setTimeout(() => navigate("/"), 320);
  };

  return (
    <div className={`${styles.page} ${leaving ? styles.pageLeave : styles.pageEnter}`}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Политика конфиденциальности</h1>
        <p className={styles.subtitle}>Политика обработки персональных данных сайта suicore.space</p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Общие положения</h2>
          <p className={styles.text}>1.1. Настоящая политика определяет порядок обработки и защиты персональных данных пользователей сайта suicore.space.</p>
          <p className={styles.text}>1.2. Оператором данных является Нёма Пётр Иванович (ИНН 526319925537).</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Состав собираемых данных</h2>
          <p className={styles.text}>2.1. Для оформления и доставки заказа мы собираем:</p>
          <ul className={styles.list}>
            <li>Фамилию, Имя, Отчество;</li>
            <li>Номер телефона;</li>
            <li>Адрес электронной почты (для чеков и уведомлений);</li>
            <li>Полный адрес доставки (индекс, город, улица, дом, квартира).</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Цели обработки данных</h2>
          <p className={styles.text}>3.1. Данные используются исключительно для:</p>
          <ul className={styles.list}>
            <li>Обработки заказа и идентификации клиента;</li>
            <li>Доставки товара через курьерские службы;</li>
            <li>Выполнения требований законодательства (формирование чеков самозанятого).</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Третьи лица и безопасность платежей</h2>
          <p className={styles.text}>4.1. Мы передаем данные только транспортным компаниям (СДЭК/Почта РФ) в объеме, необходимом для доставки.</p>
          <p className={styles.text}>4.2. Безопасность платежей: Сайт suicore.space не собирает, не хранит и не обрабатывает данные банковских карт. Все платежи проходят на защищенном сервере Робокассы.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Права пользователя</h2>
          <p className={styles.text}>5.1. По любому вопросу относительно ваших данных вы можете написать на pprrottonn@gmail.com. Мы удалим ваши данные по первому требованию после завершения обязательств по доставке.</p>
        </section>

        <Link to="/" className={styles.backLink} onClick={handleBack}>На главную</Link>
      </div>
    </div>
  );
}
