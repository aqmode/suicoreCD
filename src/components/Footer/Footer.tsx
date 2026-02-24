import SiteFooterContent from '../SiteFooterContent/SiteFooterContent';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.root} role="contentinfo">
      <SiteFooterContent />
    </footer>
  );
}
