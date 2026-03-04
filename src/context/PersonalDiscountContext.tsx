import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { apiGetPersonalDiscount } from '../lib/api';

interface PersonalDiscountState {
  /** Процент персональной скидки (0 = нет активной скидки) */
  percent: number;
  /** Сколько оплат со скидкой осталось */
  remaining: number;
  /** Есть ли активная персональная скидка */
  active: boolean;
  /** Перезагрузить данные о скидке (например после оплаты) */
  refresh: () => Promise<void>;
}

const PersonalDiscountContext = createContext<PersonalDiscountState>({
  percent: 0,
  remaining: 0,
  active: false,
  refresh: async () => {},
});

export function PersonalDiscountProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [percent, setPercent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [active, setActive] = useState(false);

  const fetchDiscount = async () => {
    if (!user) {
      setPercent(0);
      setRemaining(0);
      setActive(false);
      return;
    }
    try {
      const { data, error } = await apiGetPersonalDiscount();
      if (!error && data) {
        setPercent(data.active ? data.percent : 0);
        setRemaining(data.remaining);
        setActive(data.active);
      }
    } catch {
      // если endpoint недоступен — просто без персональной скидки
      setPercent(0);
      setRemaining(0);
      setActive(false);
    }
  };

  useEffect(() => {
    fetchDiscount();
  }, [user?.id]);

  return (
    <PersonalDiscountContext.Provider value={{ percent, remaining, active, refresh: fetchDiscount }}>
      {children}
    </PersonalDiscountContext.Provider>
  );
}

export function usePersonalDiscount() {
  return useContext(PersonalDiscountContext);
}
