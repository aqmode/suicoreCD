import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<{ data: T | null; error: { message: string } | null }> {
  const { token: optToken, ...init } = options;
  const token = optToken ?? await getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let data: T | null = null;
  if (text) try { data = JSON.parse(text) as T; } catch { /* ignore */ }
  if (!res.ok) {
    return { data: null, error: { message: (data as { error?: string })?.error ?? res.statusText } };
  }
  return { data, error: null };
}

// Auth by login (shop_admin): returns email for Supabase sign-in
export async function apiAuthByLogin(login: string, password: string) {
  return request<{ email: string }>('/api/auth/by-login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
    token: null,
  });
}

// Profile
export async function apiGetProfile() {
  return request<Record<string, unknown>>('/api/profile');
}

export async function apiUpdateProfile(body: {
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  onboarding_desktop_done?: boolean;
  onboarding_mobile_done?: boolean;
}) {
  return request<Record<string, unknown>>('/api/profile', { method: 'PATCH', body: JSON.stringify(body) });
}

// Cart
export async function apiGetCart() {
  return request<Array<Record<string, unknown>>>('/api/cart');
}

export async function apiCartAdd(body: {
  release_id: string;
  release_name: string;
  cover_url: string;
  price_rub: number;
  quantity?: number;
  track_id?: string | null;
  track_name?: string | null;
}) {
  return request<Record<string, unknown>>('/api/cart', { method: 'POST', body: JSON.stringify(body) });
}

export async function apiCartUpdateQuantity(id: string, quantity: number) {
  return request<Record<string, unknown>>(`/api/cart/${id}`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
}

export async function apiCartRemove(id: string) {
  const res = await getToken().then((token) =>
    fetch(`${API_BASE}/api/cart/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} })
  );
  return { data: res.ok ? {} : null, error: res.ok ? null : { message: res.statusText } };
}

export async function apiCartClear() {
  const res = await getToken().then((token) =>
    fetch(`${API_BASE}/api/cart`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} })
  );
  return { data: res.ok ? {} : null, error: res.ok ? null : { message: res.statusText } };
}

// Orders
export async function apiGetOrders() {
  return request<Array<Record<string, unknown>>>('/api/orders');
}

export async function apiCreateOrder(body: {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_address?: string | null;
  pvz_code?: string | null;
  pvz_name?: string | null;
  total_rub: number;
  status?: string;
  items: Array<{ release_id: string; release_name: string; cover_url: string | null; price_rub: number; quantity: number; track_id?: string | null; track_name?: string | null }>;
}) {
  return request<{ id: string; inv_id: number }>('/api/orders', { method: 'POST', body: JSON.stringify(body) });
}

export async function apiCreatePayment(order_id: string, out_sum: number) {
  return request<{ payUrl: string }>('/api/payments/create', {
    method: 'POST',
    body: JSON.stringify({ order_id, out_sum }),
  });
}

export async function apiGetOrderStatus(orderId: string) {
  return request<{ id: string; status: string }>(`/api/order/${orderId}`);
}

// Admin
export async function apiAdminGetData(admin_password: string) {
  return request<{ users: unknown[]; orders: unknown[] }>('/api/admin/data', {
    method: 'POST',
    body: JSON.stringify({ admin_password }),
    token: null,
  });
}

export async function apiAdminUpdateOrderStatus(orderId: string, admin_password: string, new_status: string) {
  return request<{ ok: boolean }>(`/api/admin/orders/${orderId}/status`, {
    method: 'POST',
    body: JSON.stringify({ admin_password, new_status }),
    token: null,
  });
}

export async function apiAdminDeleteOrder(orderId: string, admin_password: string) {
  return request<{ ok: boolean }>(`/api/admin/orders/${orderId}/delete`, {
    method: 'POST',
    body: JSON.stringify({ admin_password }),
    token: null,
  });
}
