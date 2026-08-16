import { API_BASE } from './config';
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
      `/wp-json/fy-app/v1/catalog?fleet=${encodeURIComponent(fleet)}&per_page=50`
    );
    if (Array.isArray(app.yachts) && app.yachts.length) {
      return app.yachts;
    }
  } catch {
    // Plugin not uploaded yet — use the live Suite fleet endpoint.
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
    // Fall through to Suite.
  }
  return getJson<Yacht>(`/wp-json/fy/v1/yachts/${id}`);
}

/** First trip-total row. Never hourly rate × hours. */
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
