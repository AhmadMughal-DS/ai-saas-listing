// Admin session token (issued by POST /api/admin/login, HMAC-signed server-side).
// Every admin/write API call must send it as `Authorization: Bearer <token>`.

const KEY = 'toolver_admin_token';

export function getAdminToken(): string {
  try {
    return sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminToken(token: string, remember: boolean): void {
  try {
    clearAdminToken();
    (remember ? localStorage : sessionStorage).setItem(KEY, token);
  } catch {
    /* storage blocked — session lasts until reload */
  }
}

export function clearAdminToken(): void {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
    // legacy flag from the old client-side login
    sessionStorage.removeItem('aiflux_admin_auth');
    localStorage.removeItem('aiflux_admin_auth');
  } catch {
    /* ignore */
  }
}

/** fetch() with the admin token attached. Fires `toolver-admin-logout` on 401. */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = getAdminToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    clearAdminToken();
    window.dispatchEvent(new Event('toolver-admin-logout'));
  }
  return res;
}
