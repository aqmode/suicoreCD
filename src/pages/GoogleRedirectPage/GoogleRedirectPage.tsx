import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function GoogleRedirectPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/profile', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    };
    run();
  }, [navigate]);

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      Вход...
    </div>
  );
}
