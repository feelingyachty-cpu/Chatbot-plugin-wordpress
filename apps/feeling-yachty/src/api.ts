import { API_BASE, APP_KEY, TALK_WEBHOOK } from './config';
import { durationSlug } from './pricing';
import type { CatalogYacht, Yacht } from './types';
export { durationSlug, listedTotal, money, startingListed, startingTotal } from './pricing';

let appApiMissing = false;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function decodeHtml(value?: string): string {
  if (!value) {
    return '';
  }
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeYacht<T extends Yacht>(yacht: T): T {
  return { ...yacht, title: decodeHtml(yacht.title) || yacht.title };
}

function mergeById(primary: CatalogYacht[], extra: CatalogYacht[]): CatalogYacht[] {
  const seen = new Set(primary.map((y) => y.id));
  const out = primary.map(normalizeYacht);
  for (const yacht of extra) {
    if (!seen.has(yacht.id)) {
      seen.add(yacht.id);
      out.push(normalizeYacht(yacht));
    }
  }
  return out;
}

async function fetchSuiteFleet(fleet: string): Promise<CatalogYacht[]> {
  const rows = await getJson<CatalogYacht[]>(`/wp-json/fy/v1/fleets/${encodeURIComponent(fleet)}/yachts`);
  return Array.isArray(rows) ? rows.map(normalizeYacht) : [];
}

export async function fetchFleet(fleet: string): Promise<CatalogYacht[]> {
  if (!appApiMissing) {
    try {
      const app = await getJson<{ yachts: CatalogYacht[] }>(
        `/wp-json/fy-app/v1/catalog?fleet=${encodeURIComponent(fleet)}&per_page=50&page=1`
      );
      if (Array.isArray(app.yachts) && app.yachts.length) {
        const all = [...app.yachts];
        for (let page = 2; page <= 8; page += 1) {
          const more = await getJson<{ yachts: CatalogYacht[]; total_pages?: number }>(
            `/wp-json/fy-app/v1/catalog?fleet=${encodeURIComponent(fleet)}&per_page=50&page=${page}`
          );
          if (!more.yachts?.length) {
            break;
          }
          all.push(...more.yachts);
          if (page >= (more.total_pages || page)) {
            break;
          }
        }
        return all.map(normalizeYacht);
      }
    } catch {
      appApiMissing = true;
    }
  }

  const primary = await fetchSuiteFleet(fleet);
  if (fleet === 'miami-yacht-rental') {
    try {
      const leftover = await fetchSuiteFleet('miami-yacht-rentals');
      return mergeById(primary, leftover);
    } catch {
      return primary;
    }
  }
  return primary;
}

export async function fetchYacht(id: number): Promise<Yacht> {
  if (!appApiMissing) {
    try {
      const app = await getJson<{ yacht: Yacht }>(`/wp-json/fy-app/v1/yachts/${id}`);
      if (app.yacht) {
        return normalizeYacht(app.yacht);
      }
    } catch {
      // Fall through to Suite.
    }
  }
  return normalizeYacht(await getJson<Yacht>(`/wp-json/fy/v1/yachts/${id}`));
}

/** Same Woo product page the website uses. Duration/guests preselect the variable product. */
export function checkoutUrl(
  yacht: Yacht,
  opts?: { duration?: string; guests?: number; cityPath?: string }
): string {
  const fallback = `${API_BASE}/${opts?.cityPath || 'miami-yacht-rental'}/`;
  const base = yacht.product_url || yacht.button_url || fallback;
  const parts: string[] = [];
  const slug = durationSlug(opts?.duration);
  if (slug) {
    parts.push(`attribute_pa_charter-duration=${encodeURIComponent(slug)}`);
  }
  if (opts?.guests && opts.guests > 0) {
    parts.push(`attribute_pa_passenger-count=${encodeURIComponent(String(opts.guests))}`);
  }
  if (!parts.length) {
    return base;
  }
  return `${base}${base.includes('?') ? '&' : '?'}${parts.join('&')}`;
}

export async function sendTalkMessage(payload: {
  name: string;
  phone: string;
  email?: string;
  message: string;
  city: string;
  yacht_id?: number;
  yacht_title?: string;
  product_url?: string;
  duration?: string;
}): Promise<void> {
  const res = await fetch(TALK_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-fy-app-key': APP_KEY,
    },
    body: JSON.stringify({
      ...payload,
      source: 'feeling-yachty-app',
    }),
  });
  if (!res.ok) {
    throw new Error('Could not reach the team. Try WhatsApp or Call.');
  }
}
