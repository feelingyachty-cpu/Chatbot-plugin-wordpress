import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACCOUNT_WEBHOOK, API_BASE, APP_KEY } from './config';
import type { AppSettings, AppUser, Booking } from './types';
import { DEFAULT_SETTINGS } from './types';

const TOKEN_KEY = 'fy.token';
const USER_KEY = 'fy.user';
const SETTINGS_KEY = 'fy.settings';

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
  try {
    const res = await fetch(`${API_BASE}/wp-json/fy-app/v1${path}`, init);
    if (res.status === 404) {
      return null;
    }
    const json = (await res.json()) as T & { message?: string; code?: string };
    if (!res.ok) {
      throw new Error((json as { message?: string }).message || `Request failed (${res.status})`);
    }
    return json;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Request failed')) {
      throw err;
    }
    return null;
  }
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

export async function registerAccount(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  region?: string;
}): Promise<AppUser> {
  const wp = await tryWp<AccountOk>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = wp || (await n8n('register', input));
  if (!data.token || !data.user) {
    throw new Error('Account created but login failed. Try logging in.');
  }
  await saveSession(data.token, data.user);
  return data.user;
}

export async function loginAccount(email: string, password: string): Promise<AppUser> {
  const wp = await tryWp<AccountOk>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = wp || (await n8n('login', { email, password }));
  if (!data.token || !data.user) {
    throw new Error('Email or password is not correct.');
  }
  await saveSession(data.token, data.user);
  return data.user;
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

export async function fetchMe(): Promise<{ user: AppUser; bookings: Booking[] } | null> {
  const token = await loadToken();
  if (!token) {
    return null;
  }
  try {
    const wp = await tryWp<AccountOk>('/me', { headers: authHeaders(token) });
    const data = wp || (await n8n('me', {}, token));
    if (!data.user) {
      return null;
    }
    await saveSession(token, data.user);
    return { user: data.user, bookings: data.bookings || [] };
  } catch {
    return null;
  }
}

export async function updateAccount(patch: Record<string, unknown>): Promise<AppUser> {
  const token = await loadToken();
  if (!token) {
    throw new Error('Please log in.');
  }
  const wp = await tryWp<AccountOk>('/me', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(patch),
  });
  const data = wp || (await n8n('update', patch, token));
  if (!data.user) {
    throw new Error('Could not save your profile.');
  }
  await saveSession(data.token || token, data.user);
  return data.user;
}

export async function uploadPhoto(photoData: string): Promise<AppUser> {
  return updateAccount({ photo_data: photoData, action: 'photo' });
}
