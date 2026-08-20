import { API_BASE, APP_URL } from './config';
import { durationSlug } from './pricing';
import type { PricingRow, Yacht } from './types';
export {
  accountBootstrap,
  accountChromeCss,
  bookingBootstrap,
  chromeCss,
} from './store-chrome';

export const CHARTER_FEES = {
  crewPerHour: 100,
  fuelPerHour: 75,
  depositThreshold: 1400,
  depositPct: 0.2,
} as const;

export const START_TIMES = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30',
];

const DURATION_ATTR = 'attribute_pa_charter-duration';
const GUESTS_ATTR = 'attribute_pa_passenger-count';

export type BookingPrefill = {
  date: string;
  time: string;
  duration: string;
  guests: number;
};

export type BookingUrlOptions = {
  cityPath?: string;
  date?: string;
  time?: string;
  duration?: string;
  guests?: number;
  appMode?: boolean;
  pick?: string;
  autoCheckout?: boolean;
  hideGallery?: boolean;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function appHostOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  try {
    return new URL(APP_URL).origin;
  } catch {
    return '';
  }
}

export function withAppMode(url: string): string {
  try {
    const parsed = new URL(url, API_BASE);
    parsed.searchParams.set('fy_app', '1');
    const host = appHostOrigin();
    if (host) {
      parsed.searchParams.set('fy_host', host);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function bookingUrl(yacht: Yacht, opts: BookingUrlOptions = {}): string {
  const base =
    yacht.button_url ||
    yacht.product_url ||
    `${API_BASE}/${opts.cityPath || 'miami-yacht-rental'}/`;
  const parts: string[] = [];
  const slug = durationSlug(opts.duration);
  if (slug) {
    parts.push(`${DURATION_ATTR}=${encodeURIComponent(slug)}`);
  }
  if (opts.guests && opts.guests > 0) {
    parts.push(`${GUESTS_ATTR}=${encodeURIComponent(String(opts.guests))}`);
  }
  if (opts.appMode) {
    parts.push('fy_app=1');
    const host = appHostOrigin();
    if (host) {
      parts.push(`fy_host=${encodeURIComponent(host)}`);
    }
  }
  if (opts.pick) {
    parts.push(`fy_pick=${encodeURIComponent(opts.pick)}`);
  }
  if (opts.date) {
    parts.push(`fy_date=${encodeURIComponent(opts.date)}`);
  }
  if (opts.time) {
    parts.push(`fy_time=${encodeURIComponent(opts.time)}`);
  }
  if (opts.autoCheckout) {
    parts.push('fy_go=checkout');
  }
  if (opts.hideGallery) {
    parts.push('fy_nogallery=1');
  }
  if (!parts.length) {
    return base;
  }
  return `${base}${base.includes('?') ? '&' : '?'}${parts.join('&')}`;
}

export function pricedDurations(yacht: Pick<Yacht, 'pricing'>): PricingRow[] {
  return (Array.isArray(yacht.pricing) ? yacht.pricing : []).filter(
    (row) =>
      row &&
      (row.type || 'price') === 'price' &&
      row.price != null &&
      Number.isFinite(Number(row.price))
  );
}

export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function defaultBookingPrefill(yacht: Yacht): BookingPrefill {
  const rows = pricedDurations(yacht);
  const cheapest = [...rows].sort((a, b) => Number(a.price) - Number(b.price))[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const maxGuests = yacht.capacity_max && yacht.capacity_max > 0 ? yacht.capacity_max : 99;
  return {
    date: isoDate(tomorrow),
    time: '10:00',
    duration: cheapest?.duration || rows[0]?.duration || '',
    guests: Math.min(2, maxGuests),
  };
}

export function extrasBookingUrl(
  yacht: Yacht,
  opts?: {
    cityPath?: string;
    date?: string;
    time?: string;
    duration?: string;
    guests?: number;
    savedIds?: number[];
  }
): string {
  const defaults = defaultBookingPrefill(yacht);
  const saved = (opts?.savedIds || []).filter((id) => id !== yacht.id).slice(0, 12);
  const url =
    bookingUrl(yacht, {
      appMode: true,
      cityPath: opts?.cityPath,
      date: opts?.date || defaults.date,
      time: opts?.time || defaults.time,
      duration: opts?.duration || defaults.duration,
      guests: opts?.guests && opts.guests > 0 ? opts.guests : defaults.guests,
      hideGallery: true,
    }) + (saved.length ? `&fy_saved=${saved.join(',')}` : '');
  return url;
}

export function siteCartUrl(): string {
  return withAppMode(`${API_BASE}/cart/`);
}

export function siteCheckoutUrl(): string {
  return withAppMode(`${API_BASE}/checkout/`);
}

export function isOrderReceived(url: string): boolean {
  return /\/order-received\//.test(url) || /[?&]order-received=/.test(url);
}

export function isCartUrl(url: string): boolean {
  return /\/cart(\/|$|\?)/.test(url) && !isOrderReceived(url);
}

export function isCheckoutUrl(url: string): boolean {
  return /\/checkout(\/|$|\?)/.test(url) && !isOrderReceived(url);
}

export function orderNumberFrom(url: string): string {
  const pathMatch = url.match(/\/order-received\/(\d+)/);
  if (pathMatch) {
    return pathMatch[1];
  }
  const queryMatch = url.match(/[?&]order-received=(\d+)/);
  return queryMatch ? queryMatch[1] : '';
}

export function hoursFromDuration(duration?: string): number {
  const matches = [...String(duration || '').toLowerCase().matchAll(/(\d*\.?\d+)\s*[a-z]*\s*hour/g)];
  if (!matches.length) {
    return 0;
  }
  const hours = Number(matches[matches.length - 1][1]);
  return Number.isFinite(hours) && hours > 0 ? hours : 0;
}

export function charterCharges(baseTotal: number, hours: number) {
  const base = Number(baseTotal);
  const durationHours = Number(hours);
  if (!Number.isFinite(base) || !Number.isFinite(durationHours) || base < 0 || durationHours < 0) {
    return {
      baseTotal: 0,
      crewFee: 0,
      fuelFee: 0,
      deposit: 0,
      dueToday: 0,
      dueAtDock: 0,
      totalCost: 0,
    };
  }
  const crewFee = roundMoney(CHARTER_FEES.crewPerHour * durationHours);
  const fuelFee = roundMoney(CHARTER_FEES.fuelPerHour * durationHours);
  const deposit =
    base > CHARTER_FEES.depositThreshold ? roundMoney(base * CHARTER_FEES.depositPct) : 0;
  return {
    baseTotal: base,
    crewFee,
    fuelFee,
    deposit,
    dueToday: roundMoney(crewFee + fuelFee + deposit),
    dueAtDock: roundMoney(base - deposit),
    totalCost: roundMoney(base + crewFee + fuelFee),
  };
}

export function prettyDate(iso: string, lang?: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) {
    return iso;
  }
  const locale = lang === 'es' ? 'es-ES' : 'en-US';
  const date = new Date(year, month - 1, day);
  try {
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return date.toLocaleDateString('en-US');
  }
}

export function prettyTime(time: string): string {
  const [hourRaw, minuteRaw] = time.split(':').map(Number);
  if (Number.isNaN(hourRaw)) {
    return time;
  }
  const suffix = hourRaw >= 12 ? 'PM' : 'AM';
  const hour = hourRaw % 12 === 0 ? 12 : hourRaw % 12;
  return `${hour}:${String(minuteRaw).padStart(2, '0')} ${suffix}`;
}

/** Prefetch a booking URL in the web shell (no-op on native). */
export function warmBookingPage(url: string): void {
  if (typeof document === 'undefined' || !url) {
    return;
  }
  const oldFrame = document.getElementById('fy-warm-frame');
  if (oldFrame?.parentNode) {
    oldFrame.parentNode.removeChild(oldFrame);
  }
  let link = document.getElementById('fy-prefetch-link') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = 'fy-prefetch-link';
    link.rel = 'prefetch';
    link.setAttribute('as', 'document');
    document.head.appendChild(link);
  }
  if (link.getAttribute('href') !== url) {
    link.href = url;
  }
}
