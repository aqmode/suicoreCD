import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import * as api from '../../lib/api';
import { formatRub } from '../../lib/prices';
import type { Profile } from '../../types/database';
import TruckOnRoad from '../../components/TruckOnRoad/TruckOnRoad';
import styles from './ProfilePage.module.css';

interface OrderItem {
  release_name: string;
  quantity: number;
}

interface OrderRow {
  id: string;
  total_rub: number;
  status: string;
  created_at: string;
  pvz_name: string | null;
  delivery_address: string | null;
  items?: OrderItem[];
}

function orderStatusLabel(o: OrderRow): string {
  if (o.status === 'new') return 'Ожидает оплаты';
  if (o.status === 'paid') return 'Оплачено, ожидает отправки';
  if (o.status === 'shipped') return 'Отправлено';
  if (o.status === 'at_pvz') {
    const addr = o.pvz_name || o.delivery_address || 'ПВЗ';
    return `Ждёт в ПВЗ [${addr}]`;
  }
  return 'Ожидает оплаты';
}

const ORDERS_VIEWED_KEY = 'suicore_orders_viewed';

function getOrdersViewed(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ORDERS_VIEWED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function setOrdersViewed(orders: { id: string; status: string }[]) {
  const next: Record<string, string> = { ...getOrdersViewed() };
  for (const o of orders) next[o.id] = o.status;
  localStorage.setItem(ORDERS_VIEWED_KEY, JSON.stringify(next));
}

// Часы: перезапуск gif раз в 40 сек, чтобы анимация была заметно медленнее
function SlowClock({ className }: { className?: string }) {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setKey((k) => k + 1), 40000);
    return () => clearInterval(t);
  }, []);
  return (
    <img
      key={key}
      src="/waiting/clock.gif"
      alt=""
      className={className}
    />
  );
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'orders' ? 'orders' : 'profile';
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ordersViewed, setOrdersViewedState] = useState<Record<string, string>>(getOrdersViewed);

  const isLocalhost = (() => {
    try {
      if (typeof window === 'undefined') return false;
      const h = window.location?.hostname ?? '';
      return h === 'localhost' || h === '127.0.0.1';
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    if (!authLoading && !user && !isLocalhost) {
      navigate('/', { replace: true });
      return;
    }
    if (!user) {
      if (isLocalhost) setLoading(false);
      return;
    }

    const load = async () => {
      const { data } = await api.apiGetProfile();
      if (data) {
        setProfile(data as unknown as Profile);
        setFullName((data.full_name as string) ?? '');
        setPhone((data.phone as string) ?? '');
      }
      setLoading(false);
    };
    load();
  }, [user, authLoading, navigate, isLocalhost]);

  // Загружаем заказы при заходе в профиль (и для вкладки, и для счётчика непросмотренных)
  useEffect(() => {
    if (!user) return;
    setOrdersViewedState(getOrdersViewed());
    setOrdersLoading(true);
    api.apiGetOrders().then(({ data }) => {
      setOrders((data ?? []) as unknown as OrderRow[]);
      setOrdersLoading(false);
    });
  }, [user]);

  // При открытии вкладки «Заказы» помечаем заказы как просмотренные — счётчик обнуляется
  useEffect(() => {
    if (tab === 'orders' && orders.length > 0) {
      setOrdersViewed(orders);
      setOrdersViewedState((prev) => {
        const next = { ...prev };
        for (const o of orders) next[o.id] = o.status;
        return next;
      });
    }
  }, [tab, orders]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { data, error } = await api.apiUpdateProfile({ full_name: fullName || null, phone: phone || null });
    setSaving(false);
    if (error) return;
    if (data) {
      setProfile(data as unknown as Profile);
      setFullName((data.full_name as string) ?? '');
      setPhone((data.phone as string) ?? '');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });
    if (uploadError) return;
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    await api.apiUpdateProfile({ avatar_url: urlData.publicUrl });
    setProfile((p) => (p ? { ...p, avatar_url: urlData.publicUrl } : null));
    e.target.value = '';
  };

  if (authLoading || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  const setTab = (t: 'profile' | 'orders') => {
    setSearchParams(t === 'orders' ? { tab: 'orders' } : {});
  };

  const unviewedCount = orders.filter((o) => ordersViewed[o.id] !== o.status).length;
  const showLocalhostMessage = !user && isLocalhost;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={tab === 'profile' ? styles.tabActive : styles.tab}
            onClick={() => setTab('profile')}
          >
            Профиль
          </button>
          <button
            type="button"
            className={tab === 'orders' ? styles.tabActive : styles.tab}
            onClick={() => setTab('orders')}
            aria-label={unviewedCount > 0 ? `Заказы: ${unviewedCount} непросмотренных` : 'Заказы'}
          >
            Заказы
            {unviewedCount > 0 && (
              <span className={styles.tabBadge}>{unviewedCount > 99 ? '99+' : unviewedCount}</span>
            )}
          </button>
        </div>

        {showLocalhostMessage ? (
          <p className={styles.emptyOrders}>
            На localhost вход отключён. Заказы и профиль доступны после входа на проде.
          </p>
        ) : tab === 'orders' ? (
          <>
            <h1 className={styles.title}>Заказы</h1>
            {ordersLoading ? (
              <div className={styles.loading}>Загрузка…</div>
            ) : (() => {
              const paidOrders = orders.filter((o) => ['paid', 'shipped', 'at_pvz'].includes(String(o.status ?? '').toLowerCase()));
              return paidOrders.length === 0 ? (
                <p className={styles.emptyOrders}>Пока нет заказов</p>
              ) : (
                <ul className={styles.orderList}>
                  {paidOrders.map((o) => (
                    <li key={o.id} className={styles.orderCard}>
                      <div className={styles.orderMeta}>
                        <span className={styles.orderDate}>
                          {new Date(o.created_at).toLocaleString('ru', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className={styles.orderTotal}>{formatRub(o.total_rub)}</span>
                      </div>
                      <p className={styles.orderDelivery}>{orderStatusLabel(o)}</p>
                      {(o.items?.length ?? 0) > 0 && (
                        <ul className={styles.orderItemsList}>
                          {o.items!.map((it, i) => (
                            <li key={i}>
                              {it.release_name}
                              {it.quantity > 1 ? ` × ${it.quantity}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className={styles.orderDeliveryDays}>Доставка до 7 дней</p>
                      {o.status === 'at_pvz' ? (
                        <div className={styles.orderStatusImg}>
                          <img src="/waiting/arrived.png" alt="" />
                        </div>
                      ) : o.status === 'shipped' ? (
                        <div className={styles.orderStatusImg}>
                          <TruckOnRoad className={styles.orderTruckWrap} />
                        </div>
                      ) : (
                        <div className={styles.orderStatusImg}>
                          <img src="/waiting/sclad.png" alt="" className={styles.orderSclad} />
                          <SlowClock className={styles.orderClock} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              );
            })()}
          </>
        ) : (
          <>
            <h1 className={styles.title}>Профиль</h1>

            <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.avatarSection}>
            <button
              type="button"
              className={styles.avatarWrap}
              onClick={() => fileInputRef.current?.click()}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className={styles.avatarImg}
                />
              ) : (
                <span className={styles.avatarPlaceholder}>фото</span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className={styles.fileInput}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="text"
              className={styles.input}
              value={user?.email ?? ''}
              disabled
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Имя</label>
            <input
              type="text"
              className={styles.input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ваше имя"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Телефон</label>
            <input
              type="tel"
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 123-45-67"
            />
          </div>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
          </>
        )}
      </div>
    </div>
  );
}
