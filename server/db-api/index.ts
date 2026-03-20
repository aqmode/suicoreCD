import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { pool } from './db';
import { authMiddleware, type AuthUser } from './auth';
import { createSpotifyMiddleware } from '../spotify';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Spotify (artist/albums/tracks) — в dev обрабатывает Vite, в проде — здесь
app.use('/api/spotify', createSpotifyMiddleware(process.env as Record<string, string>));

// Проверка доступности API (при 502 — убедитесь, что сервер запущен и слушает порт)
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(503).json({ ok: false, error: e instanceof Error ? e.message : 'DB' });
  }
});

// ---------- Auth by login (shop_db login_users) ----------
app.post('/api/auth/by-login', async (req, res) => {
  try {
    const { login, password } = req.body ?? {};
    if (!login || typeof password !== 'string') {
      return res.status(400).json({ error: 'Нужны логин и пароль' });
    }
    const r = await pool.query<{ password_hash: string; email: string }>(
      'SELECT password_hash, email FROM public.login_users WHERE login = $1',
      [String(login).trim()]
    );
    if (r.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный логин или пароль.' });
    }
    const { password_hash: hash, email } = r.rows[0];
    const ok = await bcrypt.compare(password, hash);
    if (!ok) {
      return res.status(401).json({ error: 'Неверный логин или пароль.' });
    }
    res.json({ email });
  } catch (e) {
    console.error('[auth/by-login]', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Ошибка сервера' });
  }
});

const reqUser = (req: express.Request): AuthUser => (req as express.Request & { user: AuthUser }).user;

// ---------- Profile ----------
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const { id } = reqUser(req);
    let r = await pool.query('SELECT * FROM public.profiles WHERE id = $1', [id]);
    if (r.rows.length === 0) {
      await pool.query('INSERT INTO public.profiles (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [id]);
      r = await pool.query('SELECT * FROM public.profiles WHERE id = $1', [id]);
    }
    res.json(r.rows[0] ?? { id, full_name: null, avatar_url: null, phone: null, created_at: null, updated_at: null });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.patch('/api/profile', authMiddleware, async (req, res) => {
  try {
    const { id } = reqUser(req);
    const { full_name, phone, avatar_url, onboarding_desktop_done, onboarding_mobile_done } = req.body;
    await pool.query('INSERT INTO public.profiles (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [id]);
    if (full_name !== undefined || phone !== undefined) {
      await pool.query(
        `INSERT INTO public.profiles (id, full_name, phone, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           phone = EXCLUDED.phone,
           updated_at = now()`,
        [id, full_name ?? null, phone ?? null]
      );
    }
    if (avatar_url != null) {
      await pool.query(
        'UPDATE public.profiles SET avatar_url = $1, updated_at = now() WHERE id = $2',
        [avatar_url, id]
      );
    }
    if (typeof onboarding_desktop_done === 'boolean') {
      await pool.query(
        'UPDATE public.profiles SET onboarding_desktop_done = $1, updated_at = now() WHERE id = $2',
        [onboarding_desktop_done, id]
      );
    }
    if (typeof onboarding_mobile_done === 'boolean') {
      await pool.query(
        'UPDATE public.profiles SET onboarding_mobile_done = $1, updated_at = now() WHERE id = $2',
        [onboarding_mobile_done, id]
      );
    }
    const r = await pool.query('SELECT * FROM public.profiles WHERE id = $1', [id]);
    res.json(r.rows[0] ?? {});
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.post('/api/profile/upsert', authMiddleware, async (req, res) => {
  try {
    const { id } = reqUser(req);
    const { full_name } = req.body;
    await pool.query(
      `INSERT INTO public.profiles (id, full_name) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET full_name = COALESCE(EXCLUDED.full_name, profiles.full_name)`,
      [id, full_name ?? null]
    );
    const r = await pool.query('SELECT * FROM public.profiles WHERE id = $1', [id]);
    res.json(r.rows[0] ?? {});
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

// ---------- Cart ----------
app.get('/api/cart', authMiddleware, async (req, res) => {
  try {
    const { id } = reqUser(req);
    const r = await pool.query(
      'SELECT * FROM public.cart_items WHERE user_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.post('/api/cart', authMiddleware, async (req, res) => {
  try {
    const { id } = reqUser(req);
    const { release_id, release_name, cover_url, price_rub, quantity = 1, track_id, track_name } = req.body;
    const track = track_id ?? '';
    const existing = await pool.query(
      'SELECT id, quantity FROM public.cart_items WHERE user_id = $1 AND release_id = $2 AND COALESCE(track_id, \'\') = $3',
      [id, release_id, track]
    );
    if (existing.rows.length > 0) {
      const newQty = (existing.rows[0].quantity ?? 0) + (quantity || 1);
      const r = await pool.query(
        'UPDATE public.cart_items SET quantity = $1 WHERE id = $2 RETURNING *',
        [newQty, existing.rows[0].id]
      );
      return res.json(r.rows[0]);
    }
    const r = await pool.query(
      `INSERT INTO public.cart_items (user_id, release_id, release_name, cover_url, price_rub, quantity, track_id, track_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, release_id, release_name, cover_url ?? '', price_rub, quantity || 1, track_id ?? null, track_name ?? null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.patch('/api/cart/:id', authMiddleware, async (req, res) => {
  try {
    const userId = reqUser(req).id;
    const { id } = req.params;
    const { quantity } = req.body;
    const r = await pool.query(
      'UPDATE public.cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [quantity, id, userId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.delete('/api/cart/:id', authMiddleware, async (req, res) => {
  try {
    const userId = reqUser(req).id;
    const { id } = req.params;
    await pool.query('DELETE FROM public.cart_items WHERE id = $1 AND user_id = $2', [id, userId]);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.delete('/api/cart', authMiddleware, async (req, res) => {
  try {
    const { id } = reqUser(req);
    await pool.query('DELETE FROM public.cart_items WHERE user_id = $1', [id]);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

// ---------- Orders ----------
// Список заказов пользователя — только оплаченные/отправленные (без new), чтобы не показывать
// неоплаченные/зависшие заказы в «Мои заказы» и блоке доставок.
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { id } = reqUser(req);
    const r = await pool.query(
      `SELECT id, total_rub, status, created_at, pvz_name, delivery_address FROM public.orders
       WHERE user_id = $1 AND status IN ('paid', 'shipped', 'at_pvz') ORDER BY created_at DESC`,
      [id]
    );
    const orders = r.rows as { id: string }[];
    if (orders.length === 0) return res.json([]);
    const ids = orders.map((o) => o.id);
    let itemsByOrder: Record<string, { release_name: string; track_name: string | null; quantity: number }[]> = {};
    try {
      const itemsR = await pool.query<{ order_id: string; release_name: string; track_name: string | null; quantity: number }>(
        `SELECT order_id, release_name, track_name, quantity FROM public.order_items WHERE order_id = ANY($1::uuid[]) ORDER BY order_id`,
        [ids]
      );
      for (const row of itemsR.rows) {
        if (!itemsByOrder[row.order_id]) itemsByOrder[row.order_id] = [];
        itemsByOrder[row.order_id].push({ release_name: row.release_name, track_name: row.track_name ?? null, quantity: row.quantity });
      }
    } catch (colErr) {
      const itemsR = await pool.query<{ order_id: string; release_name: string; quantity: number }>(
        `SELECT order_id, release_name, quantity FROM public.order_items WHERE order_id = ANY($1::uuid[]) ORDER BY order_id`,
        [ids]
      );
      for (const row of itemsR.rows) {
        if (!itemsByOrder[row.order_id]) itemsByOrder[row.order_id] = [];
        itemsByOrder[row.order_id].push({ release_name: row.release_name, track_name: null, quantity: row.quantity });
      }
    }
    const result = orders.map((o) => ({ ...o, items: itemsByOrder[o.id] ?? [] }));
    res.json(result);
  } catch (e) {
    console.error('[GET /api/orders]', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.get('/api/order/:id', authMiddleware, async (req, res) => {
  try {
    const { id: userId } = reqUser(req);
    const { id: orderId } = req.params;
    const r = await pool.query<{ id: string; status: string }>(
      'SELECT id, status FROM public.orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const userId = reqUser(req).id;
    const { customer_name, customer_phone, customer_email, delivery_address, pvz_code, pvz_name, total_rub, status = 'new', items } = req.body;
    const orderR = await pool.query(
      `INSERT INTO public.orders (user_id, customer_name, customer_phone, customer_email, delivery_address, pvz_code, pvz_name, total_rub, status, inv_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, nextval('public.order_inv_id_seq')) RETURNING id, inv_id`,
      [userId, customer_name, customer_phone, customer_email, delivery_address ?? null, pvz_code ?? null, pvz_name ?? null, total_rub, status]
    );
    const orderId = orderR.rows[0].id;
    let invId = orderR.rows[0].inv_id ?? orderR.rows[0]['inv_id'];
    if (invId == null) {
      const r = await pool.query('SELECT inv_id FROM public.orders WHERE id = $1', [orderId]);
      invId = r.rows[0]?.inv_id ?? r.rows[0]?.['inv_id'];
    }
    for (const it of items ?? []) {
      await pool.query(
        `INSERT INTO public.order_items (order_id, release_id, release_name, cover_url, price_rub, quantity, track_id, track_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [orderId, it.release_id, it.release_name, it.cover_url ?? null, it.price_rub, it.quantity ?? 1, it.track_id ?? null, it.track_name ?? null]
      );
    }
    if (invId == null) {
      return res.status(500).json({ error: 'Order created but inv_id missing. Run migration 05_orders_inv_id_robokassa.sql.' });
    }
    res.status(201).json({ id: orderId, inv_id: Number(invId) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

// ---------- Payments (YooKassa) ----------
const YOOKASSA_ID = process.env.YOOKASSA_ID ?? '';
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY ?? '';
const PAYMENT_BASE_URL = process.env.PAYMENT_BASE_URL ?? 'https://suicore.space';
const YOOKASSA_API = 'https://api.yookassa.ru/v3/payments';

/** Допустимые IP ЮKassa для вебхука (официальный список). */
const YOOKASSA_IP_RANGES = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11/32',
  '77.75.156.35/32',
  '77.75.154.128/25',
  '2a02:5180::/32',
];

function ipToIntV4(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const x = parseInt(p, 10);
    if (Number.isNaN(x) || x < 0 || x > 255) return null;
    n = (n << 8) | x;
  }
  return n >>> 0;
}

function ipInCidrV4(ipInt: number, cidr: string): boolean {
  const [netStr, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) return false;
  const netInt = ipToIntV4(netStr);
  if (netInt === null) return false;
  const shift = 32 - prefix;
  return (ipInt >>> shift) === (netInt >>> shift);
}

function ipV6PrefixMatch(ip: string, prefixCidr: string): boolean {
  const [prefixNet, prefixStr] = prefixCidr.split('/');
  const prefixLen = parseInt(prefixStr, 10) || 32;
  const normalize = (s: string): string[] => {
    const raw = s.replace(/^\[|\].*$/g, '').toLowerCase();
    const parts = raw.split(':');
    const result: string[] = [];
    let gap = -1;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === '') {
        if (gap === -1) gap = i;
        continue;
      }
      result.push(parts[i].padStart(4, '0'));
    }
    const need = 8 - result.length;
    if (need <= 0) return result.slice(0, 8);
    if (gap === -1) return [...result, ...Array(need).fill('0000')];
    return [...result.slice(0, gap), ...Array(need).fill('0000'), ...result.slice(gap)];
  };
  const ipParts = normalize(ip);
  const netParts = normalize(prefixNet);
  const groups = Math.min(8, Math.ceil(prefixLen / 16));
  for (let i = 0; i < groups; i++) {
    if ((ipParts[i] ?? '0000') !== (netParts[i] ?? '0000')) return false;
  }
  return true;
}

function isYooKassaIp(ip: string): boolean {
  const trimmed = (ip || '').trim();
  if (!trimmed) return false;
  if (trimmed.includes(':')) {
    for (const cidr of YOOKASSA_IP_RANGES) {
      if (cidr.includes(':')) {
        if (ipV6PrefixMatch(trimmed, cidr)) return true;
      }
    }
    return false;
  }
  const ipInt = ipToIntV4(trimmed);
  if (ipInt === null) return false;
  for (const cidr of YOOKASSA_IP_RANGES) {
    if (!cidr.includes(':')) {
      if (ipInCidrV4(ipInt, cidr)) return true;
    }
  }
  return false;
}

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0];
    if (first) return first.trim();
  }
  return req.socket?.remoteAddress ?? req.ip ?? '';
}

app.post('/api/payments/create', authMiddleware, async (req, res) => {
  try {
    const { order_id: orderId, out_sum: outSum } = req.body;
    if (!orderId || outSum == null || !YOOKASSA_ID || !YOOKASSA_SECRET_KEY) {
      return res.status(400).json({ error: 'order_id and out_sum required; YooKassa not configured' });
    }
    const amount = Number(outSum);
    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const valueStr = amount.toFixed(2);
    const auth = Buffer.from(`${YOOKASSA_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64');
    const body = {
      amount: { value: valueStr, currency: 'RUB' },
      confirmation: {
        type: 'redirect',
        return_url: `${PAYMENT_BASE_URL}/order/success?order=${encodeURIComponent(orderId)}`,
      },
      capture: true,
      description: `Заказ ${orderId}`,
      metadata: { orderId: String(orderId) },
    };
    const createRes = await fetch(YOOKASSA_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
        'Idempotence-Key': orderId,
      },
      body: JSON.stringify(body),
    });
    const data = (await createRes.json()) as {
      confirmation?: { confirmation_url?: string };
      status?: string;
      code?: string;
      description?: string;
    };
    if (!createRes.ok) {
      console.error('[YooKassa] Create payment error:', data);
      return res.status(createRes.status).json({
        error: data.description || data.code || 'YooKassa error',
      });
    }
    const payUrl = data.confirmation?.confirmation_url;
    if (!payUrl) {
      return res.status(500).json({ error: 'No payment URL from YooKassa' });
    }
    res.json({ payUrl });
  } catch (e) {
    console.error('[YooKassa] Create payment exception:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.post('/api/payments/yookassa', async (req, res) => {
  const clientIp = getClientIp(req);
  if (!isYooKassaIp(clientIp)) {
    console.warn('[YooKassa] Webhook rejected: IP not in whitelist', { ip: clientIp });
    res.status(403).send('Forbidden');
    return;
  }
  try {
    res.status(200).send();
    const body = req.body as { event?: string; object?: { metadata?: { orderId?: string }; status?: string } };
    const event = body?.event;
    const obj = body?.object;
    const orderId = obj?.metadata?.orderId;
    if (!orderId) {
      console.warn('[YooKassa] Webhook: no orderId in metadata', { event });
      return;
    }
    if (event === 'payment.succeeded') {
      await pool.query("UPDATE public.orders SET status = 'paid' WHERE id = $1", [orderId]);
      console.log('[YooKassa] Order %s marked paid', orderId);
    } else if (event === 'payment.canceled') {
      await pool.query("UPDATE public.orders SET status = 'canceled' WHERE id = $1", [orderId]);
      console.log('[YooKassa] Order %s marked canceled', orderId);
    }
  } catch (e) {
    console.error('[YooKassa] Webhook error:', e);
  }
});

// ---------- Admin (no auth middleware; password inside) ----------
app.post('/api/admin/data', async (req, res) => {
  try {
    const { admin_password } = req.body;
    const r = await pool.query('SELECT public.get_admin_data($1::text) AS result', [admin_password]);
    const result = r.rows[0]?.result ?? null;
    if (result == null) return res.status(401).json({ error: 'Неверный пароль' });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.post('/api/admin/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_password, new_status } = req.body;
    const r = await pool.query('SELECT public.update_order_status_admin($1::text, $2::uuid, $3::text) AS ok', [admin_password, id, new_status]);
    const ok = r.rows[0]?.ok;
    if (!ok) return res.status(400).json({ error: 'Не удалось обновить статус' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.post('/api/admin/orders/:id/delete', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_password } = req.body;
    const r = await pool.query('SELECT public.delete_order_admin($1::text, $2::uuid) AS ok', [admin_password, id]);
    const ok = r.rows[0]?.ok;
    if (!ok) return res.status(400).json({ error: 'Не удалось удалить заказ' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

const PORT = Number(process.env.API_PORT) || 3001;
app.listen(PORT, () => console.log(`[db-api] http://localhost:${PORT}`));
