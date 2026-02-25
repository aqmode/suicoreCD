import { useState, useEffect, useCallback, type FormEvent } from "react";
import * as api from "../../lib/api";
import { formatRub } from "../../lib/prices";
import styles from "./AdminPage.module.css";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  release_id: string;
  release_name: string;
  cover_url: string | null;
  price_rub: number;
  quantity: number;
}

interface Order {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_address: string | null;
  pvz_code: string | null;
  pvz_name: string | null;
  total_rub: number;
  status: string;
  created_at: string;
  items: OrderItem[];
}

interface AdminData {
  users: Profile[];
  orders: Order[];
}

const STORAGE_KEY = "admin_session";

const ORDER_STATUSES = [
  { value: "new", label: "Ждет отправки" },
  { value: "shipped", label: "Отправлено" },
  { value: "at_pvz", label: "Приехало" },
] as const;

const PAID_STATUSES = ["paid", "shipped", "at_pvz"];

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderSearchId, setOrderSearchId] = useState("");
  const [showUnpaid, setShowUnpaid] = useState(false);

  const loadData = useCallback(async (pwd: string) => {
    setLoading(true);
    setError(null);
    const { data: result, error: err } = await api.apiAdminGetData(pwd);
    setLoading(false);
    if (err) {
      setError(err.message);
      return false;
    }
    if (result == null) {
      setError("Неверный пароль");
      return false;
    }
    setData(result as AdminData);
    return true;
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      loadData(stored).then((ok) => {
        if (!ok) sessionStorage.removeItem(STORAGE_KEY);
      });
    }
  }, [loadData]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    const ok = await loadData(password.trim());
    if (ok) sessionStorage.setItem(STORAGE_KEY, password.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setData(null);
    setPassword("");
    setError(null);
  };

  const getStoredPassword = () => sessionStorage.getItem(STORAGE_KEY);

  const handleUpdateStatus = useCallback(
    async (orderId: string, newStatus: string) => {
      const pwd = getStoredPassword();
      if (!pwd || !data) return;
      if (!["new", "shipped", "at_pvz"].includes(newStatus)) return;
      setError(null);
      const { data: ok, error: err } = await api.apiAdminUpdateOrderStatus(orderId, pwd, newStatus);
      if (err) {
        setError(err.message || "Ошибка смены статуса");
        return;
      }
      if (ok) await loadData(pwd);
    },
    [data, loadData]
  );

  const handleDeleteOrder = useCallback(
    async (orderId: string) => {
      const pwd = getStoredPassword();
      if (!pwd || !data) return;
      if (!confirm("Удалить этот заказ? Позиции заказа будут удалены.")) return;
      setError(null);
      const { data: ok, error: err } = await api.apiAdminDeleteOrder(String(orderId), pwd);
      if (err) {
        const e = err as { message?: string; details?: string; hint?: string };
        let msg = e.message || "Ошибка при удалении";
        if (e.details) msg += ` — ${e.details}`;
        if (e.hint) msg += ` (${e.hint})`;
        setError(msg);
        console.error("[Admin] delete_order_admin error:", err);
        return;
      }
      if (ok) {
        await loadData(pwd);
      } else {
        setError("Не удалось удалить заказ (неверный пароль или нет прав)");
      }
    },
    [data, loadData]
  );

  if (data === null && !loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loginBox}>
          <h1 className={styles.title}>Админ-панель</h1>
          <form onSubmit={handleLogin} className={styles.form}>
            <input
              type="password"
              className={styles.input}
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? "…" : "Войти"}
            </button>
          </form>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>
    );
  }

  if (loading && data === null) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Загрузка…</div>
      </div>
    );
  }

  const users = data?.users ?? [];
  const allOrders = data?.orders ?? [];
  const orderSearchTrim = orderSearchId.trim().toLowerCase();
  const ordersFilteredByStatus = showUnpaid ? allOrders : allOrders.filter((o) => PAID_STATUSES.includes(o.status));
  const orders = orderSearchTrim
    ? ordersFilteredByStatus.filter((o) => o.id.toLowerCase().includes(orderSearchTrim))
    : ordersFilteredByStatus;

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <h1 className={styles.title}>Админ-панель</h1>
          <button type="button" className={styles.logout} onClick={handleLogout}>
            Выйти
          </button>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Пользователи ({users.length})</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя</th>
                  <th>Телефон</th>
                  <th>Создан</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className={styles.mono}>{u.id.slice(0, 8)}…</td>
                    <td>{u.full_name ?? "—"}</td>
                    <td>{u.phone ?? "—"}</td>
                    <td>{new Date(u.created_at).toLocaleString("ru")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.ordersHeader}>
            <h2 className={styles.sectionTitle}>
              Заказы {orderSearchTrim ? `(${orders.length} из ${ordersFilteredByStatus.length})` : `(${orders.length})`}
            </h2>
            <label className={styles.showUnpaidLabel}>
              <input
                type="checkbox"
                checked={showUnpaid}
                onChange={(e) => setShowUnpaid(e.target.checked)}
                className={styles.showUnpaidCheckbox}
              />
              Показать неоплаченные (new)
            </label>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Поиск по ID заказа"
              value={orderSearchId}
              onChange={(e) => setOrderSearchId(e.target.value)}
              aria-label="Поиск по ID заказа"
            />
          </div>

          {orderSearchTrim && (
            <div className={styles.searchResult}>
              {orders.length === 0 ? (
                <p className={styles.searchResultEmpty}>Ничего не найдено</p>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className={styles.searchResultCard}>
                    <div className={styles.searchResultRow}>
                      <span className={styles.mono} title={o.id}>{o.id.slice(0, 8)}</span>
                      <span>{new Date(o.created_at).toLocaleString("ru")}</span>
                      <span>{o.customer_name}</span>
                      <span>{formatRub(o.total_rub)}</span>
                      <select
                        className={styles.statusSelect}
                        value={ORDER_STATUSES.some((s) => s.value === o.status) ? o.status : "new"}
                        onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                        aria-label="Статус заказа"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteOrder(o.id)}
                        title="Удалить заказ"
                      >
                        Удалить
                      </button>
                    </div>
                    {(o.items?.length ?? 0) > 0 && (
                      <ul className={styles.itemsList}>
                        {(o.items ?? []).map((i) => (
                          <li key={i.id}>
                            {i.release_name} × {i.quantity} — {formatRub(i.price_rub * i.quantity)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID заказа</th>
                  <th>Дата</th>
                  <th>Получатель</th>
                  <th>Телефон</th>
                  <th>Email</th>
                  <th>Адрес / ПВЗ</th>
                  <th>Код ПВЗ</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className={styles.mono} title={o.id}>
                      {o.id.slice(0, 8)}
                    </td>
                    <td>{new Date(o.created_at).toLocaleString("ru")}</td>
                    <td>{o.customer_name}</td>
                    <td>{o.customer_phone}</td>
                    <td>{o.customer_email}</td>
                    <td>
                      {o.delivery_address ?? (o.pvz_name ? "ПВЗ: " + o.pvz_name : "—")}
                    </td>
                    <td className={styles.mono}>{o.pvz_code ?? "—"}</td>
                    <td>{formatRub(o.total_rub)}</td>
                    <td>
                      <select
                        className={styles.statusSelect}
                        value={ORDER_STATUSES.some((s) => s.value === o.status) ? o.status : "new"}
                        onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                        aria-label="Статус заказа"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteOrder(o.id)}
                        title="Удалить заказ"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.length === 0 && (
            <p className={styles.hint}>Заказов пока нет.</p>
          )}

          {orders.some((o) => (o.items?.length ?? 0) > 0) && (
            <>
              <h3 className={styles.subTitle}>Состав заказов</h3>
              {orders.map((o) => (
                <div key={o.id} className={styles.orderBlock}>
                  <strong>
                    <span className={styles.mono} title={o.id}>{o.id.slice(0, 8)}</span>
                    {" · "}
                    {new Date(o.created_at).toLocaleString("ru")} — {o.customer_name} ({formatRub(o.total_rub)})
                  </strong>
                  <ul className={styles.itemsList}>
                    {(o.items ?? []).map((i) => (
                      <li key={i.id}>
                        {i.release_name} × {i.quantity} — {formatRub(i.price_rub * i.quantity)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
