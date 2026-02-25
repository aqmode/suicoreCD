import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./TermsPage.module.css";

export default function TermsPage() {
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
        <h1 className={styles.title}>Публичная оферта</h1>
        <p className={styles.subtitle}>Договор купли-продажи. Интернет-магазин suicore.space</p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Общие положения</h2>
          <p className={styles.text}>1.1. Настоящая оферта является официальным предложением самозанятого Нёма Петра Ивановича (ИНН 526319925537), далее именуемого «Продавец», по продаже товаров через интернет-сайт suicore.space.</p>
          <p className={styles.text}>1.2. Акцептом (принятием) настоящей оферты является полная оплата заказа Покупателем на сайте.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Предмет договора</h2>
          <p className={styles.text}>2.1. Продавец обязуется передать в собственность Покупателя товар (музыкальные носители на компакт-дисках), а Покупатель обязуется оплатить и принять товар на условиях настоящей оферты.</p>
          <p className={styles.text}>2.2. Реализация товара осуществляется на законных основаниях. Продавец является правообладателем либо действует на основании соглашения с правообладателем и имеет право на распространение указанной продукции с использованием соответствующих товарных знаков и обозначений.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Оплата и доставка</h2>
          <p className={styles.text}>3.1. Оплата осуществляется через платежный сервис Robokassa.</p>
          <p className={styles.text}>3.2. Доставка товара осуществляется по РФ силами служб СДЭК или Почта России. Риск случайной гибели товара переходит к Покупателю в момент передачи отправления в службу доставки.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Условия возврата (очень важно)</h2>
          <p className={styles.text}>4.1. В соответствии с Постановлением Правительства РФ от 31.12.2020 №2463, непериодические издания (включая диски) надлежащего качества не подлежат возврату или обмену, если они были распечатаны (нарушена заводская упаковка, термоусадочная пленка или защитная пломба).</p>
          <p className={styles.text}>4.2. Покупатель имеет право отказаться от товара надлежащего качества в течение 7 (семи) дней с момента получения только при условии полного сохранения товарного вида и целостности заводской упаковки/пломбы.</p>
          <p className={styles.text}>4.3. При обнаружении следов вскрытия, эксплуатации или повреждения защитной пленки Продавец имеет право отказать в возврате денежных средств на законных основаниях.</p>
          <p className={styles.text}>4.4. Все расходы по обратной пересылке товара надлежащего качества оплачиваются Покупателем.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Реквизиты</h2>
          <p className={styles.text}>Продавец: Нёма Пётр Иванович</p>
          <p className={styles.text}>ИНН: 526319925537</p>
          <p className={styles.text}>Место нахождения: г. Нижний Новгород</p>
          <p className={styles.text}>E-mail: pprrottonn@gmail.com</p>
          <p className={styles.text}>Номер телефона: +79036070794</p>
        </section>

        <Link to="/" className={styles.backLink} onClick={handleBack}>На главную</Link>
      </div>
    </div>
  );
}
