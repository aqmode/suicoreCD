import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import styles from './InfoPage.module.css';

type SectionId = 'payment' | 'delivery' | 'return';

const SECTIONS: { id: SectionId; title: string; content: React.ReactNode }[] = [
  {
    id: 'payment',
    title: 'Оплата',
    content: (
      <>
        <p>Оплата заказа производится онлайн через платёжный сервис Робокасса.</p>
        <p>Доступные способы: банковские карты (МИР, Visa, MasterCard), СБП.</p>
      </>
    ),
  },
  {
    id: 'delivery',
    title: 'Доставка',
    content: (
      <>
        <p>Доставка осуществляется транспортной компанией СДЭК или Почтой России.</p>
        <p>Стоимость рассчитывается при оформлении.</p>
        <p>Срок подготовки заказа к отправке: 1–3 рабочих дня.</p>
      </>
    ),
  },
  {
    id: 'return',
    title: 'Обмен и возврат',
    content: (
      <>
        <p>
          В соответствии с Постановлением Правительства РФ от 31.12.2020 №2463, непериодические издания (включая диски) надлежащего качества не подлежат возврату или обмену, если они были распечатаны (нарушена заводская упаковка, термоусадочная пленка или защитная пломба).
        </p>
        <p>
          Покупатель имеет право отказаться от товара надлежащего качества в течение 7 (семи) дней с момента получения.
        </p>
        <p>
          При обнаружении следов вскрытия, эксплуатации или повреждения защитной пленки Продавец имеет право отказать в возврате денежных средств на законных основаниях.
        </p>
        <p>
          Все расходы по обратной пересылке товара надлежащего качества оплачиваются Покупателем.
        </p>
      </>
    ),
  },
];

export default function InfoPage() {
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get('section');

  const [openIds, setOpenIds] = useState<Set<SectionId>>(() => new Set());

  useEffect(() => {
    const toOpen: Set<SectionId> =
      sectionParam === 'return'
        ? new Set(['return'])
        : sectionParam === 'delivery'
          ? new Set(['payment', 'delivery'])
          : new Set();
    if (toOpen.size === 0) return;
    const t = setTimeout(() => setOpenIds(toOpen), 80);
    return () => clearTimeout(t);
  }, [sectionParam]);

  const toggle = (id: SectionId) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Оплата, доставка и возврат</h1>
        <p className={styles.subtitle}>
          <Link to="/info" className={styles.link}>Информация</Link> для покупателей
        </p>

        <div className={styles.accordion}>
          {SECTIONS.map(({ id, title, content }) => (
            <div key={id} className={styles.block}>
              <button
                type="button"
                className={styles.trigger}
                onClick={() => toggle(id)}
                aria-expanded={openIds.has(id)}
                aria-controls={`accordion-${id}`}
                id={`accordion-${id}-label`}
              >
                <span>{title}</span>
                <span className={openIds.has(id) ? styles.iconOpen : styles.iconClosed} aria-hidden>▼</span>
              </button>
              <div
                id={`accordion-${id}`}
                role="region"
                aria-labelledby={`accordion-${id}-label`}
                className={openIds.has(id) ? `${styles.panel} ${styles.panelOpen}` : styles.panel}
              >
                <div className={styles.panelInner}>{content}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
