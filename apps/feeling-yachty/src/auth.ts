import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACCOUNT_WEBHOOK, API_BASE, APP_KEY } from './config';
import type { AppSettings, AppUser, Booking } from './types';
import { DEFAULT_SETTINGS } from './types';

const TOKEN_KEY = 'fy.token';
const USER_KEY = 'fy.user';
const SETTINGS_KEY = 'fy.settings';

export type AuthSession = { user: AppUser; bookings: Booking[] };

export async function loadToken(): Promise<string> {
  return (await AsyncStorage.getItem(TOKEN_KEY)) || '';
}

export async function loadCachedUser(): Promise<AppUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

export async function loadSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettingsLocal(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

async function saveSession(token: string, user: AppUser): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  if (user.settings) {
    const current = await loadSettings();
    await saveSettingsLocal({ ...current, ...user.settings });
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

type AccountOk = { ok: true; token?: string; user?: AppUser; bookings?: Booking[] };
type AccountErr = { ok: false; error?: string };

async function tryWp<T>(path: string, init: RequestInit): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/wp-json/fy-app/v1${path}`, init);
  } catch {
    return null;
  }
  let json = {} as T & { message?: string; code?: string };
  try {
    json = (await res.json()) as T & { message?: string; code?: string };
  } catch {
    if (res.status === 404) {
      return null;
    }
    throw new Error(`Request failed (${res.status})`);
  }
  if (res.status === 404 || json.code === 'rest_no_route') {
    return null;
  }
  if (!res.ok) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json as T;
}

async function n8n(action: string, body: Record<string, unknown>, token?: string): Promise<AccountOk> {
  const res = await fetch(ACCOUNT_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-fy-app-key': APP_KEY,
    },
    body: JSON.stringify({ action, token, ...body }),
  });
  const json = (await res.json()) as AccountOk | AccountErr;
  if (!res.ok || !json || (json as AccountErr).ok === false) {
    throw new Error((json as AccountErr).error || 'Could not reach your account.');
  }
  return json as AccountOk;
}

function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function sessionFrom(data: AccountOk): AuthSession {
  if (!data.token || !data.user) {
    throw new Error('Email or password is not correct.');
  }
  return { user: data.user, bookings: data.bookings || [] };
}

export async function registerAccount(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  region?: string;
}): Promise<AuthSession> {
  const wp = await tryWp<AccountOk>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = wp || (await n8n('register', input));
  const session = sessionFrom(data);
  await saveSession(data.token as string, session.user);
  return session;
}

export async function loginAccount(email: string, password: string): Promise<AuthSession> {
  const wp = await tryWp<AccountOk>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = wp || (await n8n('login', { email, password }));
  const session = sessionFrom(data);
  await saveSession(data.token as string, session.user);
  return session;
}

export async function logoutAccount(): Promise<void> {
  const token = await loadToken();
  if (token) {
    try {
      const wp = await tryWp<{ ok: boolean }>('/auth/logout', {
        method: 'POST',
        headers: authHeaders(token),
        body: '{}',
      });
      if (!wp) {
        await n8n('logout', {}, token);
      }
    } catch {
      // Still clear the device session.
    }
  }
  await clearSession();
}

export async function fetchMe(): Promise<AuthSession | null> {
  const token = await loadToken();
  if (!token) {
    return null;
  }
  try {
    const wp = await tryWp<AccountOk>('/me', { headers: authHeaders(token) });
    const data = wp || (await n8n('me', {}, token));
    if (!data.user) {
      await clearSession();
      return null;
    }
    await saveSession(data.token || token, data.user);
    return { user: data.user, bookings: data.bookings || [] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (/please log in|not correct|unauthorized|401/i.test(msg)) {
      await clearSession();
    }
    return null;
  }
}

export async function updateAccount(patch: Record<string, unknown>): Promise<AppUser> {
  const token = await loadToken();
  if (!token) {
    throw new Error('Please log in.');
  }
  const { action: _ignored, ...safePatch } = patch;
  const wp = await tryWp<AccountOk>('/me', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(safePatch),
  });
  const data = wp || (await n8n('update', safePatch, token));
  if (!data.user) {
    throw new Error('Could not save your profile.');
  }
  await saveSession(data.token || token, data.user);
  return data.user;
}

export async function uploadPhoto(photoData: string): Promise<AppUser> {
  const raw = photoData.includes(',') ? photoData.split(',')[1] || '' : photoData;
  if (raw.length > 420000) {
    throw new Error('Photo is too large. Choose a closer crop or a smaller picture.');
  }
  return updateAccount({ photo_data: photoData });
}
