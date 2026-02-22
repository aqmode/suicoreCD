import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import * as api from '../lib/api';
import type { CartItem } from '../types/database';

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
}

const CartContext = createContext<CartState>({
  items: [],
  loading: true,
  addItem: async () => {},
  removeItem: async () => {},
  setQuantity: async () => {},
  clearCart: async () => {},
  totalRub: 0,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setItems([]);
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

  const addItem = useCallback(
    async (
      release: { id: string; name: string; coverUrl: string },
      priceRub: number,
      track?: { id: string; name: string }
    ) => {
      if (!user) return;
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
    },
    [user?.id, fetchCart]
  );

  const removeItem = useCallback(
    async (cartItemId: string) => {
      if (!user) return;
      await api.apiCartRemove(cartItemId);
      await fetchCart();
    },
    [user?.id, fetchCart]
  );

  const setQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      if (!user) return;
      if (quantity < 1) {
        await removeItem(cartItemId);
        return;
      }
      await api.apiCartUpdateQuantity(cartItemId, quantity);
      await fetchCart();
    },
    [user?.id, fetchCart, removeItem]
  );

  const clearCart = useCallback(async () => {
    if (!user) return;
    await api.apiCartClear();
    await fetchCart();
  }, [user?.id, fetchCart]);

  const totalRub = items.reduce((s, i) => s + i.price_rub * i.quantity, 0);

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
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
