import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import styles from './MobileInfoDrawer.module.css';

const COPYRIGHT = '© 2026 SuicoreCD. All rights reserved.';

export default function MobileInfoDrawer() {
  const [open, setOpen] = useState(false);

  const overlayAndDrawer = (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
      <div
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-label="Информация и документы"
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => setOpen(false)}
          aria-label="Закрыть"
        >
          ×
        </button>
        <div className={styles.content}>
          <div className={styles.legal}>
            Самозанятый Нёма П.И., ИНН 526319925537, г. Нижний Новгород
          </div>
          <div className={styles.contacts}>
            <a href="mailto:pprrottonn@gmail.com" className={styles.link}>
              pprrottonn@gmail.com
            </a>
            <span className={styles.sep}> · </span>
            <a href="tel:+79036070794" className={styles.link}>
              +7 903 607-07-94
            </a>
            <span className={styles.sep}> · </span>
            <a
              href="https://t.me/suicoree"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              Telegram @suicoree
            </a>
          </div>
          <div className={styles.copyright}>{COPYRIGHT}</div>
          <nav className={styles.nav} aria-label="Документы и информация">
            <Link to="/offer" className={styles.navLink} onClick={() => setOpen(false)}>
              Политика конфиденциальности
            </Link>
            <Link to="/terms" className={styles.navLink} onClick={() => setOpen(false)}>
              Публичная оферта
            </Link>
            <Link to="/info?section=delivery" className={styles.navLink} onClick={() => setOpen(false)}>
              Оплата и доставка
            </Link>
            <Link to="/info?section=return" className={styles.navLink} onClick={() => setOpen(false)}>
              Обмен и возврат
            </Link>
          </nav>
        </div>
      </div>
    </>
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.bar}>
        <button
          type="button"
          className={styles.trigger}
          onClick={() => setOpen(true)}
          aria-expanded={open}
        >
          показать информацию
        </button>
      </div>
      {typeof document !== 'undefined' &&
        createPortal(overlayAndDrawer, document.body)}
    </div>
  );
}
