import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LegalLinks from '../../components/LegalLinks/LegalLinks';
import styles from './AuthRequiredPage.module.css';

const BROWSE_WITHOUT_AUTH_KEY = 'suicore_browse_without_auth';

export function getBrowseWithoutAuth(): boolean {
  try {
    return typeof window !== 'undefined' && sessionStorage.getItem(BROWSE_WITHOUT_AUTH_KEY) === '1';
  } catch {
    return false;
  }
}

export default function AuthRequiredPage() {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleBrowseWithoutAuth = () => {
    try {
      sessionStorage.setItem(BROWSE_WITHOUT_AUTH_KEY, '1');
    } catch {
      /* ignore */
    }
    navigate('/', { replace: true });
  };

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
        <button
          type="button"
          className={styles.browseBtn}
          onClick={handleBrowseWithoutAuth}
        >
          Я пока тут осмотрюсь
        </button>
      </div>
    </div>
  );
}
