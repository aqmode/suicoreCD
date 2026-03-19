import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';
import * as api from '../lib/api';
import {
  readCookieCart,
  writeCookieCart,
  clearCookieCart,
  cookieCartItemId,
  type CookieCartRow,
} from '../lib/cookieCart';
import type { CartItem } from '../types/database';

function cookieRowsToCartItems(rows: CookieCartRow[]): CartItem[] {
  const now = new Date().toISOString();
  return rows.map((r) => ({
    id: cookieCartItemId(r),
    user_id: '',
    release_id: r.release_id,
    release_name: r.release_name,
    cover_url: r.cover_url,
    price_rub: r.price_rub,
    quantity: r.quantity,
    created_at: now,
    track_id: r.track_id,
    track_name: r.track_name,
  }));
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  addItem: (
    release: { id: string; name: string; coverUrl: string },
    priceRub: number,
    track?: { id: string; name: string }
  ) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  setQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalRub: number;
  getEffectivePrice: (item: CartItem) => number;
  hasAlbumDiscount: (item: CartItem) => boolean;
}

const CartContext = createContext<CartState>({
  items: [],
  loading: true,
  addItem: async () => {},
  removeItem: async () => {},
  setQuantity: async () => {},
  clearCart: async () => {},
  totalRub: 0,
  getEffectivePrice: () => 0,
  hasAlbumDiscount: () => false,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const prevUserRef = useRef<User | null | undefined>(undefined);

  const fetchCart = useCallback(async () => {
    if (!user) {
      const rows = readCookieCart();
      setItems(cookieRowsToCartItems(rows));
      setLoading(false);
      return;
    }
    const { data, error } = await api.apiGetCart();
    if (!error) setItems((data || []) as unknown as CartItem[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    const prev = prevUserRef.current;
    prevUserRef.current = user;
    if (prev === null && user) {
      const rows = readCookieCart();
      if (rows.length > 0) {
        (async () => {
          for (const r of rows) {
            await api.apiCartAdd({
              release_id: r.release_id,
              release_name: r.release_name,
              cover_url: r.cover_url,
              price_rub: r.price_rub,
              quantity: r.quantity,
              track_id: r.track_id ?? null,
              track_name: r.track_name ?? null,
            });
          }
          clearCookieCart();
          const { data, error } = await api.apiGetCart();
          if (!error) setItems((data || []) as unknown as CartItem[]);
        })();
      }
    }
  }, [user]);

  const addItem = useCallback(
    async (
      release: { id: string; name: string; coverUrl: string },
      priceRub: number,
      track?: { id: string; name: string }
    ) => {
      if (user) {
        await api.apiCartAdd({
          release_id: release.id,
          release_name: release.name,
          cover_url: release.coverUrl,
          price_rub: priceRub,
          quantity: 1,
          track_id: track?.id ?? null,
          track_name: track?.name ?? null,
        });
        await fetchCart();
        return;
      }
      const rows = readCookieCart();
      const trackKey = track?.id ?? null;
      const existing = rows.findIndex(
        (r) => r.release_id === release.id && (r.track_id ?? null) === trackKey
      );
      if (existing >= 0) {
        rows[existing].quantity += 1;
      } else {
        rows.push({
          release_id: release.id,
          release_name: release.name,
          cover_url: release.coverUrl,
          price_rub: priceRub,
          quantity: 1,
          track_id: track?.id ?? null,
          track_name: track?.name ?? null,
        });
      }
      writeCookieCart(rows);
      setItems(cookieRowsToCartItems(rows));
    },
    [user?.id, fetchCart]
  );

  const removeItem = useCallback(
    async (cartItemId: string) => {
      if (user) {
        await api.apiCartRemove(cartItemId);
        await fetchCart();
        return;
      }
      if (!cartItemId.startsWith('cookie_')) return;
      const rows = readCookieCart().filter((r) => cookieCartItemId(r) !== cartItemId);
      writeCookieCart(rows);
      setItems(cookieRowsToCartItems(rows));
    },
    [user?.id, fetchCart]
  );

  const setQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      if (user) {
        if (quantity < 1) {
          await api.apiCartRemove(cartItemId);
        } else {
          await api.apiCartUpdateQuantity(cartItemId, quantity);
        }
        await fetchCart();
        return;
      }
      if (quantity < 1) {
        const rows = readCookieCart().filter((r) => cookieCartItemId(r) !== cartItemId);
        writeCookieCart(rows);
        setItems(cookieRowsToCartItems(rows));
        return;
      }
      const rows = readCookieCart();
      const idx = rows.findIndex((r) => cookieCartItemId(r) === cartItemId);
      if (idx >= 0) {
        rows[idx].quantity = quantity;
        writeCookieCart(rows);
        setItems(cookieRowsToCartItems(rows));
      }
    },
    [user?.id, fetchCart]
  );

  const clearCart = useCallback(async () => {
    if (user) {
      await api.apiCartClear();
      await fetchCart();
      return;
    }
    clearCookieCart();
    setItems([]);
  }, [user?.id, fetchCart]);

  /** В новой модели "1 альбом = 1 диск" скидка за набор дисков не применяется */
  const getEffectivePrice = useCallback(
    (item: CartItem) => item.price_rub,
    []
  );

  const hasAlbumDiscount = useCallback(
    (_item: CartItem) => false,
    []
  );

  const totalRub = useMemo(
    () => items.reduce((s, i) => s + getEffectivePrice(i) * i.quantity, 0),
    [items, getEffectivePrice]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        addItem,
        removeItem,
        setQuantity,
        clearCart,
        totalRub,
        getEffectivePrice,
        hasAlbumDiscount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
