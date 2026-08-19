import type { PricingRow, Yacht } from './types';

/** Guest-facing split used on extras: half now, half at the dock. */
export const DEPOSIT_RATE = 0.5;

export function priceRows(yacht: Pick<Yacht, 'pricing'>): PricingRow[] {
  return (yacht.pricing || []).filter((row) => (row.type || 'price') === 'price' && row.price != null);
}

export function hoursFromDuration(duration?: string): number | null {
  if (!duration) {
    return null;
  }
  const match = String(duration).match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function durationSlug(duration?: string): string {
  const hours = hoursFromDuration(duration);
  if (hours == null) {
    return duration ? String(duration).toLowerCase().trim().replace(/\s+/g, '-') : '';
  }
  return hours === 1 ? '1-hour' : `${hours}-hours`;
}

/**
 * Trip total for a duration. Uses the matching pricing[] row.
 * Never invents hourly `price` × hours when a row exists.
 */
export function tripTotal(yacht: Yacht, duration?: string): number | null {
  const rows = priceRows(yacht);
  if (duration) {
    const hours = hoursFromDuration(duration);
    const match = rows.find((row) => hoursFromDuration(row.duration) === hours && hours != null);
    if (match) {
      return Number(match.price);
    }
    const exact = rows.find((row) => String(row.duration).trim() === String(duration).trim());
    if (exact) {
      return Number(exact.price);
    }
  }
  if (rows.length) {
    return Number(rows.reduce((a, b) => (Number(a.price) <= Number(b.price) ? a : b)).price);
  }
  if (yacht.starting?.amount != null) {
    return Number(yacht.starting.amount);
  }
  return null;
}

export function startingTotal(yacht: Yacht): { amount: number; duration: string } | null {
  const rows = priceRows(yacht);
  if (rows.length) {
    const best = rows.reduce((a, b) => (Number(a.price) <= Number(b.price) ? a : b));
    return { amount: Number(best.price), duration: best.duration || '' };
  }
  if (yacht.starting && yacht.starting.amount != null) {
    return yacht.starting;
  }
  return null;
}

export type DockQuote = {
  duration: string;
  tripTotal: number;
  payNow: number;
  dueAtDock: number;
  depositRate: number;
  wooStale: boolean;
};

/**
 * due_at_dock = trip_total − pay_now.
 * pay_now is 50% of that duration's trip total, unless Woo sent a deposit
 * that is positive and not larger than the trip (cloned $175/hr tables are ignored).
 */
export function dockQuote(yacht: Yacht, duration?: string, wooPayNow?: number | null): DockQuote | null {
  const start = startingTotal(yacht);
  const label = duration || start?.duration || '';
  const total = tripTotal(yacht, label);
  if (total == null || total <= 0) {
    return null;
  }
  const half = roundMoney(total * DEPOSIT_RATE);
  const woo = wooPayNow != null ? Number(wooPayNow) : null;
  const wooOk = woo != null && woo > 0 && woo <= total + 0.009;
  const payNow = wooOk ? roundMoney(woo) : half;
  return {
    duration: label,
    tripTotal: roundMoney(total),
    payNow,
    dueAtDock: roundMoney(total - payNow),
    depositRate: DEPOSIT_RATE,
    wooStale: woo != null && !wooOk,
  };
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function money(amount: number): string {
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
