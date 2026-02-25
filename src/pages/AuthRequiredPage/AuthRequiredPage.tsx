import { useState, type FormEvent } from 'react';
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
  const { signInWithGoogle, signInWithYooKassa } = useAuth();
  const navigate = useNavigate();
  const [yooOpen, setYooOpen] = useState(false);
  const [yooLogin, setYooLogin] = useState('');
  const [yooPassword, setYooPassword] = useState('');
  const [yooError, setYooError] = useState<string | null>(null);
  const [yooLoading, setYooLoading] = useState(false);
  const [yooShowOnboarding, setYooShowOnboarding] = useState(false);

  const handleBrowseWithoutAuth = () => {
    try {
      sessionStorage.setItem(BROWSE_WITHOUT_AUTH_KEY, '1');
    } catch {
      /* ignore */
    }
    navigate('/', { replace: true });
  };

  const handleYooSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setYooError(null);
    setYooLoading(true);
    try {
      const { error } = await signInWithYooKassa(yooLogin.trim(), yooPassword);
      if (error) {
        setYooError(error);
        return;
      }
      if (yooShowOnboarding) {
        try {
          sessionStorage.setItem(FORCE_ONBOARDING_AFTER_LOGIN_KEY, '1');
        } catch {
          /* ignore */
        }
      }
      setYooOpen(false);
      navigate('/', { replace: true });
    } finally {
      setYooLoading(false);
    }
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
          className={styles.yookassaBtn}
          onClick={() => {
            setYooOpen(true);
            setYooError(null);
            setYooLogin('');
            setYooPassword('');
          }}
        >
          Я из ЮКассы
        </button>

        <button
          type="button"
          className={styles.browseBtn}
          onClick={handleBrowseWithoutAuth}
        >
          Я пока тут осмотрюсь
        </button>
      </div>

      {yooOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => !yooLoading && setYooOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="yookassa-modal-title"
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 id="yookassa-modal-title" className={styles.modalTitle}>
              Вход для тестового пользователя ЮKassa
            </h2>
            <form onSubmit={handleYooSubmit} className={styles.modalForm}>
              <label className={styles.modalLabel} htmlFor="yoo-login">
                Логин
              </label>
              <input
                id="yoo-login"
                type="text"
                className={styles.modalInput}
                value={yooLogin}
                onChange={(e) => setYooLogin(e.target.value)}
                placeholder="yookassa"
                autoComplete="username"
                required
                autoFocus
              />
              <label className={styles.modalLabel} htmlFor="yoo-password">
                Пароль
              </label>
              <input
                id="yoo-password"
                type="password"
                className={styles.modalInput}
                value={yooPassword}
                onChange={(e) => setYooPassword(e.target.value)}
                placeholder="••••••••••••••••"
                autoComplete="current-password"
                required
              />
              <label className={styles.modalCheckboxWrap}>
                <input
                  type="checkbox"
                  className={styles.modalCheckbox}
                  checked={yooShowOnboarding}
                  onChange={(e) => setYooShowOnboarding(e.target.checked)}
                />
                <span className={styles.modalCheckboxLabel}>Пройти обучение</span>
              </label>
              {yooError && <p className={styles.modalError} role="alert">{yooError}</p>}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalCancel}
                  onClick={() => !yooLoading && setYooOpen(false)}
                  disabled={yooLoading}
                >
                  Отмена
                </button>
                <button type="submit" className={styles.modalSubmit} disabled={yooLoading}>
                  {yooLoading ? 'Вход…' : 'Войти'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
