import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { apiAuthByLogin } from '../lib/api';

const REDIRECT_URL =
  import.meta.env.VITE_AUTH_REDIRECT_URI ||
  (import.meta.env.VITE_APP_ORIGIN
    ? `${import.meta.env.VITE_APP_ORIGIN.replace(/\/$/, '')}/google/redirect`
    : 'http://localhost:5173/google/redirect');

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithYooKassa: (login: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithYooKassa: async () => ({}),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: REDIRECT_URL },
    });
  };

  const signInWithYooKassa = async (login: string, password: string) => {
    const { data, error: apiError } = await apiAuthByLogin(login.trim(), password);
    if (apiError || !data?.email) {
      return { error: apiError?.message ?? 'Неверный логин или пароль.' };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password,
    });
    if (error) return { error: error.message };
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithGoogle, signInWithYooKassa, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
