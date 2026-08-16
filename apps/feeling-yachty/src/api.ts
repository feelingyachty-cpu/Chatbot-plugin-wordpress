import { API_BASE, TALK_WEBHOOK } from './config';
import type { CatalogYacht, PricingRow, Yacht } from './types';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function fetchFleet(fleet: string): Promise<CatalogYacht[]> {
  try {
    const app = await getJson<{ yachts: CatalogYacht[] }>(
      `/wp-json/fy-app/v1/catalog?fleet=${encodeURIComponent(fleet)}&per_page=50&page=1`
    );
    if (Array.isArray(app.yachts) && app.yachts.length) {
      const all = [...app.yachts];
      // fy-app pages at 50; pull the rest so Browse is complete.
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
      return all;
    }
  } catch {
    // Plugin not uploaded yet.
  }
  return getJson<CatalogYacht[]>(`/wp-json/fy/v1/fleets/${encodeURIComponent(fleet)}/yachts`);
}

export async function fetchYacht(id: number): Promise<Yacht> {
  try {
    const app = await getJson<{ yacht: Yacht }>(`/wp-json/fy-app/v1/yachts/${id}`);
    if (app.yacht) {
      return app.yacht;
    }
  } catch {
    // Fall through.
  }
  return getJson<Yacht>(`/wp-json/fy/v1/yachts/${id}`);
}

export function startingTotal(yacht: Yacht): { amount: number; duration: string } | null {
  if (yacht.starting && yacht.starting.amount != null) {
    return yacht.starting;
  }
  const rows = yacht.pricing || [];
  const row = rows.find((r: PricingRow) => (r.type || 'price') === 'price' && r.price != null);
  if (!row || row.price == null) {
    return null;
  }
  return { amount: Number(row.price), duration: row.duration || '' };
}

export function checkoutUrl(yacht: Yacht): string {
  return yacht.product_url || yacht.button_url || `${API_BASE}/miami-yacht-rental/`;
}

export function money(amount: number): string {
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export async function sendTalkMessage(payload: {
  name: string;
  phone: string;
  email?: string;
  message: string;
  city: string;
}): Promise<void> {
  const res = await fetch(TALK_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-fy-app-key': 'fy-app-talk-2026',
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
