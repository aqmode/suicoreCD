import { useNavigate } from 'react-router-dom';
import { useAuth, getRedirectUrl } from '../../context/AuthContext';
import styles from './AuthRequiredPage.module.css';

const BROWSE_WITHOUT_AUTH_KEY = 'suicore_browse_without_auth';
export const FORCE_ONBOARDING_AFTER_LOGIN_KEY = 'suicore_force_onboarding_after_login';

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
      <div className={styles.inner}>
        <h1 className={styles.title}>Вход в аккаунт</h1>
        <p className={styles.text}>
          Чтобы пользоваться сайтом, необходимо зарегистрироваться или войти через Google.
        </p>
        <p className={styles.redirectHint}>
          Redirect URL для Google: <strong>{getRedirectUrl()}</strong>
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
