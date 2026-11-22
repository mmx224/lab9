export interface Profile {
  first_name: string;
  specialization: string;
  specialization_display?: string;
  bio: string;
  fee: string;
}

export interface User {
  id: number;
  username: string;
  profile: Profile;
}

export interface Choice {
  value: string;
  label: string;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface TokenResponse {
  access: string;
  user?: User;
}

const API_URL = 'https://inai-col3.fishrungames.com/api';
const LOGOUT_KEY = 'muzklub.loggedOut';

// Access хранится только в памяти. Refresh сервер хранит в HttpOnly cookie.
let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
let sessionVersion = 0;
let loggedOut = false;

function isLoggedOut(): boolean {
  if (loggedOut) return true;
  try {
    // Читаем каждый раз, чтобы учитывать выход в другой вкладке.
    return localStorage.getItem(LOGOUT_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberLogout(value: boolean) {
  loggedOut = value;
  try {
    if (value) localStorage.setItem(LOGOUT_KEY, '1');
    else localStorage.removeItem(LOGOUT_KEY);
  } catch {
    // В текущей вкладке выход работает и без localStorage.
  }
}

function errorText(data: unknown): string {
  if (typeof data === 'string') return data;
  if (!data || typeof data !== 'object') return '';
  if ('detail' in data) return errorText(data.detail);
  return Object.values(data).map(errorText).filter(Boolean).join(' ');
}

async function request<T>(path: string, method = 'GET', body?: object, token?: string): Promise<T> {
  let response: Response;
  try {
    const headers: Record<string, string> = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    response = await fetch(`${API_URL}/${path}/`, {
      method,
      credentials: 'include',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error('Нет связи с сервером. Попробуйте ещё раз.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = errorText(data) || 'Ошибка сервера.';
    throw new ApiError(response.status, message);
  }
  return data;
}

function refreshAccess(): Promise<string> {
  // Не восстанавливаем вход после выхода, даже если сервер не удалил cookie.
  if (isLoggedOut()) return Promise.reject(new ApiError(401, 'Войдите снова.'));
  if (refreshPromise) return refreshPromise;
  const version = sessionVersion;
  const pending = request<TokenResponse>('token/refresh', 'POST')
    .then(data => {
      // Старый запрос не должен восстанавливать вход после выхода или смены аккаунта.
      if (version !== sessionVersion || isLoggedOut()) throw new ApiError(401, 'Войдите снова.');
      accessToken = data.access;
      return data.access;
    })
    .catch((error: unknown) => {
      if (version === sessionVersion && error instanceof ApiError && [400, 401, 403].includes(error.status)) {
        accessToken = null;
        throw new ApiError(401, 'Сессия закончилась. Войдите снова.');
      }
      throw error;
    })
    .finally(() => {
      if (refreshPromise === pending) refreshPromise = null;
    });
  refreshPromise = pending;
  return pending;
}

async function authorizedRequest<T>(path: string, method = 'GET', body?: object): Promise<T> {
  if (isLoggedOut()) {
    accessToken = null;
    throw new ApiError(401, 'Войдите снова.');
  }
  const version = sessionVersion;
  const token = accessToken || await refreshAccess();
  try {
    return await request<T>(path, method, body, token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    if (version !== sessionVersion) throw error;
  }

  // При одновременных 401 обновляем токен один раз и повторяем каждый запрос один раз.
  const renewedToken = accessToken && accessToken !== token ? accessToken : await refreshAccess();
  try {
    return await request<T>(path, method, body, renewedToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && version === sessionVersion) {
      accessToken = null;
    }
    throw error;
  }
}

async function authenticate(path: 'register' | 'login', username: string, password: string): Promise<void> {
  const data = await request<TokenResponse>(path, 'POST', { username, password });
  sessionVersion += 1;
  accessToken = data.access;
  refreshPromise = null;
  rememberLogout(false);
}

export const api = {
  register: (username: string, password: string) => authenticate('register', username, password),
  login: (username: string, password: string) => authenticate('login', username, password),
  logout: async () => {
    // Без Bearer: сервер должен удалить refresh cookie даже с истёкшим access.
    await request<unknown>('logout', 'POST');
    sessionVersion += 1;
    accessToken = null;
    refreshPromise = null;
    rememberLogout(true);
  },
  profile: () => authorizedRequest<User>('profile'),
  updateProfile: (profile: Profile) => authorizedRequest<User>('profile', 'PATCH', profile),
  specializations: () => request<Choice[]>('specializations'),
};
