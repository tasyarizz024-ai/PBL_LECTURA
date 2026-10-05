/**
 * Lapisan API terpusat untuk seluruh pemanggilan backend.
 *
 * Tiga tanggung jawab yang sebelumnya tersebar di tiap komponen:
 *   1. menyisipkan header Authorization dari token yang disimpan,
 *   2. reacted atas HTTP 401 secara global (logout + pesan),
 *   3. membungkus response jadi JSON seragam dengan pesan error konsisten.
 * Semua komponen WAJIB memakai apiFetch/apiJson dari file ini, bukan
 * fetch() langsung — kecuali bila benar-benar butuh response mentah.
 */

const TOKEN_KEY = 'lectura_token';
const USER_KEY = 'lectura_user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};
export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * Sinyal ke App.jsx (dan tab browser lain) bahwa sesi sudah habis.
 * Project ini tidak memakai Redux/store global, jadi cukup event kustom.
 */
const SESSION_EXPIRED_EVENT = 'lectura:session-expired';

const notifySessionExpired = () => {
  clearSession();
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, {
    detail: 'Sesi berakhir, silakan login kembali.',
  }));
};

export { SESSION_EXPIRED_EVENT };

/**
 * Fetch + auth header + interceptor 401.
 *
 * @param {string} url       Path relatif, mis. '/api/dosen'
 * @param {object} [options] Opsi fetch standar + { auth: boolean, raw: boolean }
 *                           auth default true bila token tersedia.
 * @returns {Promise<Response>} Response asli, dengan .json() sudah aman
 *                             dari body kosong.
 */
export const apiFetch = async (url, options = {}) => {
  const { auth = true, headers = {}, ...rest } = options;

  const finalHeaders = { ...headers };
  const token = getToken();
  if (auth && token) finalHeaders.Authorization = `Bearer ${token}`;
  if (rest.body && typeof rest.body === 'string' && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...rest, headers: finalHeaders });

  if (res.status === 401) {
    // Hanya sesi invalid yang memicu logout. Endpoint login sendiri juga
    // membalas 401 untuk kredensial salah, dan itu tidak boleh menggeser
    // user ke halaman login (user memang belum pernah masuk).
    const isLoginAttempt = url.includes('/api/auth/login');
    if (!isLoginAttempt) {
      notifySessionExpired();
    }
  }

  return res;
};

/**
 * Versi apiFetch yang langsung return JSON, dengan pesan error seragam.
 * Melempar Error dengan .status dan .payload supaya komponen bisa
 * menampilkan message dari backend apa adanya.
 */
export const apiJson = async (url, options = {}) => {
  const res = await apiFetch(url, options);
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, message: text };
    }
  }

  if (!res.ok) {
    const err = new Error(
      data?.message || `Gagal memuat data (HTTP ${res.status}).`
    );
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
};

/** Query string dari objek; key dengan value kosong/null diabaikan. */
export const buildQuery = (params) => {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      sp.append(key, value);
    }
  });
  return sp;
};
