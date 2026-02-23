import { Link } from "react-router-dom";
import styles from "./LegalLinks.module.css";

const COPYRIGHT = "© 2026 SuicoreCD. All rights reserved.";

export default function LegalLinks() {
  return (
    <>
      <nav className={styles.wrap} aria-label="Юридические документы" style={{ opacity: 0.28, fontSize: '0.7rem' }}>
        <Link to="/offer" className={styles.link}>
          Политика конфиденциальности
        </Link>
        <span className={styles.sep}> · </span>
        <Link to="/terms" className={styles.link}>
          Публичная оферта
        </Link>
        <span className={styles.copyrightMobile}>{COPYRIGHT}</span>
      </nav>
      <div className={styles.copyrightDesktop}>{COPYRIGHT}</div>
    </>
  );
}
