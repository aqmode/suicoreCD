const COOKIE_KEY = 'suicore_cart';
const MAX_AGE_DAYS = 30;

export interface CookieCartRow {
  release_id: string;
  release_name: string;
  cover_url: string;
  price_rub: number;
  quantity: number;
  track_id: string | null;
  track_name: string | null;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) + '; path=/; expires=' + expires + '; SameSite=Lax';
}

export function readCookieCart(): CookieCartRow[] {
  try {
    const raw = getCookie(COOKIE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is CookieCartRow =>
        r &&
        typeof r === 'object' &&
        typeof (r as CookieCartRow).release_id === 'string' &&
        typeof (r as CookieCartRow).price_rub === 'number' &&
        typeof (r as CookieCartRow).quantity === 'number'
    );
  } catch {
    return [];
  }
}

export function writeCookieCart(rows: CookieCartRow[]) {
  setCookie(COOKIE_KEY, JSON.stringify(rows), MAX_AGE_DAYS);
}

export function clearCookieCart() {
  setCookie(COOKIE_KEY, '', -1);
}

export function cookieCartItemId(row: CookieCartRow): string {
  return `cookie_${row.release_id}_${row.track_id ?? 'r'}`;
}
