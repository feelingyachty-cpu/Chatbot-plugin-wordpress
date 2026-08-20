export const API_BASE = 'https://feelingyachty.com';

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
