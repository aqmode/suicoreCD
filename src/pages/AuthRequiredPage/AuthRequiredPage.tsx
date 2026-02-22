import { useAuth } from '../../context/AuthContext';
import LegalLinks from '../../components/LegalLinks/LegalLinks';
import styles from './AuthRequiredPage.module.css';

export default function AuthRequiredPage() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className={styles.page}>
      <LegalLinks />
      <div className={styles.inner}>
        <h1 className={styles.title}>Вход в аккаунт</h1>
        <p className={styles.text}>
          Чтобы пользоваться сайтом, необходимо зарегистрироваться или войти через Google.
        </p>
        <button
          type="button"
          className={styles.googleBtn}
          onClick={() => signInWithGoogle()}
        >
          Войти через Google
        </button>
      </div>
    </div>
  );
}
