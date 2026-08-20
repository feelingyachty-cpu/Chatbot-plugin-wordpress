export const API_BASE = 'https://feelingyachty.com';

export type AppEnv = 'production' | 'staging';

function envString(value: string | undefined, fallback: string): string {
  return (typeof value === 'string' ? value.trim() : '') || fallback;
}

const rawEnv = envString(process.env.EXPO_PUBLIC_APP_ENV, 'production');
export const APP_ENV: AppEnv = rawEnv === 'staging' ? 'staging' : 'production';

export const APP_URL = envString(
  process.env.EXPO_PUBLIC_APP_URL,
  APP_ENV === 'staging' ? 'https://staging.feelingyachty.com' : 'https://app.feelingyachty.com'
);

/** True when a postMessage / navigation origin is the live WooCommerce store. */
export function isStoreOrigin(origin: string | undefined | null): boolean {
  try {
    if (!origin) {
      return false;
    }
    const base = new URL(API_BASE);
    if (origin === base.origin) {
      return true;
    }
    const alt = new URL(API_BASE);
    alt.hostname = base.hostname.startsWith('www.') ? base.hostname.slice(4) : `www.${base.hostname}`;
    return origin === alt.origin;
  } catch {
    return false;
  }
}

/** n8n production webhook — upserts a GHL contact and opens the inbox thread. */
export const TALK_WEBHOOK = 'https://feelingyachty.app.n8n.cloud/webhook/fy-app-talk';

/** n8n production webhook — WooCommerce customer register/login/profile. */
export const ACCOUNT_WEBHOOK = 'https://feelingyachty.app.n8n.cloud/webhook/fy-app-account';

export const APP_KEY = 'fy-app-talk-2026';

export const GHL_FORM =
  'https://api.leadconnectorhq.com/widget/form/jtAf3RGg818QiqMy504y';

export const CITIES = [
  {
    slug: 'miami',
    label: 'Miami',
    fleet: 'miami-yacht-rental',
    phone: '+19542463636',
    whatsapp: '19542463636',
  },
  {
    slug: 'panama',
    label: 'Panama',
    fleet: 'panama-yacht-rentals',
    phone: '+5072021729',
    whatsapp: '5072021729',
  },
] as const;

export type City = (typeof CITIES)[number];
