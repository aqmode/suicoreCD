import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './YookassaLoginPage.module.css';

const YOOKASSA_LOGIN = 'yookassa';
const YOOKASSA_PASSWORD = 'weallloveyookassa';

export default function YookassaLoginPage() {
  const { signInWithYooKassa, user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await signInWithYooKassa(YOOKASSA_LOGIN, YOOKASSA_PASSWORD);
      if (cancelled) return;
      if (result?.error) {
        setError(result.error);
        setStatus('error');
        return;
      }
      navigate('/', { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, signInWithYooKassa, navigate]);

  const retry = () => {
    setStatus('loading');
    setError(null);
    signInWithYooKassa(YOOKASSA_LOGIN, YOOKASSA_PASSWORD).then((result) => {
      if (result?.error) {
        setError(result.error);
        setStatus('error');
      } else {
        navigate('/', { replace: true });
      }
    });
  };

  if (status === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.text}>Вход…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Вход</h1>
        {error && <p className={styles.error}>{error}</p>}
        <button type="button" className={styles.btn} onClick={retry}>
          Повторить
        </button>
      </div>
    </div>
  );
}
