import { Link } from 'react-router-dom';
import styles from './SiteFooterContent.module.css';

const COPYRIGHT = '© 2026 SuicoreCD. All rights reserved.';

interface Props {
  /** Дополнительный класс для обёртки (например, для встраивания в страницу альбома) */
  className?: string;
  /** Уменьшенная высота (страница альбома с секционным скроллом) */
  compact?: boolean;
}

export default function SiteFooterContent({ className = '', compact }: Props) {
  return (
    <div
      className={`${styles.root} ${compact ? styles.compact : ''} ${className}`.trim()}
      role="contentinfo"
    >
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className={styles.legal}>
            Самозанятый Нёма П.И., ИНН 526319925537, Нижний Новгород
          </div>
          <div className={styles.contacts}>
            <a href="mailto:pprrottonn@gmail.com" className={styles.link}>
              pprrottonn@gmail.com
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
        </div>
        <div className={styles.center}>{COPYRIGHT}</div>
        <nav className={styles.right} aria-label="Документы и информация">
          <Link to="/offer" className={styles.navLink}>Политика конфиденциальности</Link>
          <span className={styles.sep}> · </span>
          <Link to="/terms" className={styles.navLink}>Публичная оферта</Link>
          <span className={styles.sep}> · </span>
          <Link to="/info?section=delivery" className={styles.navLink}>Оплата и доставка</Link>
          <span className={styles.sep}> · </span>
          <Link to="/info?section=return" className={styles.navLink}>Обмен и возврат</Link>
        </nav>
      </div>
    </div>
  );
}
