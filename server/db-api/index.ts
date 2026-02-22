import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import { pool } from './db';
import { authMiddleware, type AuthUser } from './auth';
import { createSpotifyMiddleware } from '../spotify';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Spotify (artist/albums/tracks) — в dev обрабатывает Vite, в проде — здесь
app.use('/api/spotify', createSpotifyMiddleware(process.env as Record<string, string>));

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
    const { full_name, phone, avatar_url } = req.body;
    await pool.query(
      `UPDATE public.profiles SET full_name = $1, phone = $2, updated_at = now()
       WHERE id = $3`,
      [full_name ?? null, phone ?? null, id]
    );
    if (avatar_url != null) {
      await pool.query(
        'UPDATE public.profiles SET avatar_url = $1, updated_at = now() WHERE id = $2',
        [avatar_url, id]
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
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { id } = reqUser(req);
    const r = await pool.query(
      `SELECT id, total_rub, status, created_at, pvz_name, delivery_address FROM public.orders
       WHERE user_id = $1 AND status IN ('paid', 'shipped', 'at_pvz') ORDER BY created_at DESC`,
      [id]
    );
    res.json(r.rows);
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
        `INSERT INTO public.order_items (order_id, release_id, release_name, cover_url, price_rub, quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, it.release_id, it.release_name, it.cover_url ?? null, it.price_rub, it.quantity ?? 1]
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

// ---------- Payments (Robokassa) ----------
const ROBOKASSA_BASE = 'https://auth.robokassa.ru/Merchant/Index.aspx';
const ROBOKASSA_LOGIN = process.env.ROBOKASSA_LOGIN ?? '';
const ROBOKASSA_PASS1 = process.env.ROBOKASSA_PASS1 ?? '';
const ROBOKASSA_PASS2 = process.env.ROBOKASSA_PASS2 ?? '';
const PAYMENT_BASE_URL = process.env.PAYMENT_BASE_URL ?? 'https://suicore.space';

function robokassaSignature(values: string[]): string {
  return crypto.createHash('md5').update(values.join(':'), 'utf8').digest('hex');
}

app.post('/api/payments/create', authMiddleware, async (req, res) => {
  try {
    const { inv_id: invId, out_sum: outSum } = req.body;
    if (invId == null || outSum == null || !ROBOKASSA_LOGIN || !ROBOKASSA_PASS1) {
      return res.status(400).json({ error: 'inv_id and out_sum required; Robokassa not configured' });
    }
    const outSumStr = String(Number(outSum).toFixed(2));
    const invIdStr = String(Number(invId));
    const signature = robokassaSignature([ROBOKASSA_LOGIN, outSumStr, invIdStr, ROBOKASSA_PASS1]);
    const params = new URLSearchParams({
      MerchantLogin: ROBOKASSA_LOGIN,
      OutSum: outSumStr,
      InvId: invIdStr,
      SignatureValue: signature,
      IsTest: '1',
      ResultURL: `${PAYMENT_BASE_URL}/api/payments/result`,
      SuccessURL: `${PAYMENT_BASE_URL}/order/success`,
      FailURL: `${PAYMENT_BASE_URL}/order/fail`,
    });
    const payUrl = `${ROBOKASSA_BASE}?${params.toString()}`;
    res.json({ payUrl });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.post('/api/payments/result', async (req, res) => {
  const body = (req.body ?? {}) as Record<string, string>;
  console.log('[Robokassa] POST /api/payments/result received', {
    OutSum: body.OutSum ?? body.outSum,
    InvId: body.InvId ?? body.invId,
    hasSignature: !!(body.SignatureValue ?? body.signatureValue),
  });
  try {
    const outSum = body.OutSum ?? body.outSum;
    const invId = body.InvId ?? body.invId;
    const signatureValue = body.SignatureValue ?? body.signatureValue;
    if (outSum == null || invId == null || signatureValue == null || !ROBOKASSA_PASS2) {
      console.log('[Robokassa] Result rejected: bad request (missing params or ROBOKASSA_PASS2)');
      return res.status(400).send('Bad request');
    }
    const expectedSig = robokassaSignature([outSum, invId, ROBOKASSA_PASS2]);
    if (expectedSig.toLowerCase() !== String(signatureValue).toLowerCase()) {
      console.log('[Robokassa] Result rejected: invalid signature');
      return res.status(400).send('Invalid signature');
    }
    await pool.query(
      "UPDATE public.orders SET status = 'paid' WHERE inv_id = $1",
      [Number(invId)]
    );
    console.log('[Robokassa] Order inv_id=%s marked paid, sent OK%s', invId, invId);
    res.set('Content-Type', 'text/plain').send(`OK${invId}`);
  } catch (e) {
    console.error('[Robokassa] Result error:', e);
    res.status(500).send('Error');
  }
});

// ---------- Admin (no auth middleware; password inside) ----------
app.post('/api/admin/data', async (req, res) => {
  try {
    const { admin_password } = req.body;
    const r = await pool.query('SELECT public.get_admin_data($1) AS result', [admin_password]);
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
    const r = await pool.query('SELECT public.update_order_status_admin($1, $2, $3) AS ok', [admin_password, id, new_status]);
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
    const r = await pool.query('SELECT public.delete_order_admin($1, $2) AS ok', [admin_password, id]);
    const ok = r.rows[0]?.ok;
    if (!ok) return res.status(400).json({ error: 'Не удалось удалить заказ' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

const PORT = Number(process.env.API_PORT) || 3001;
app.listen(PORT, () => console.log(`[db-api] http://localhost:${PORT}`));
