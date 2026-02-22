import { Link } from "react-router-dom";
import styles from "./LegalLinks.module.css";

export default function LegalLinks() {
  return (
    <nav className={styles.wrap} aria-label="Юридические документы" style={{ opacity: 0.28, fontSize: '0.7rem' }}>
      <Link to="/offer" className={styles.link}>
        Политика конфиденциальности
      </Link>
      <span className={styles.sep}> · </span>
      <Link to="/terms" className={styles.link}>
        Публичная оферта
      </Link>
    </nav>
  );
}
