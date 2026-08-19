import type { PricingRow, Yacht } from './types';

/** Fallback only when today’s Woo / crew+deposit charge does not fit the boat total. */
export const DEPOSIT_RATE = 0.5;
/** Fleet defaults from Suite Checkout settings — blank yacht fields use these. */
export const FLEET_CREW_RATE = 100;
/** Crew $/hr when the boat total is at or under $1,400. Hourly deposit follows the $800 line. */
export const FLEET_CREW_RATE_UNDER = 75;
export const FLEET_FUEL_RATE = 50;
/** Hourly boat deposit when the boat total is at or under $800. Crew stays $75. */
export const FLEET_FUEL_RATE_UNDER = 25;
export const FUEL_THRESHOLD = 800;
export const CHARTER_DEPOSIT_THRESHOLD = 1400;
export const CHARTER_DEPOSIT_PCT = 20;

export function priceRows(yacht: Pick<Yacht, 'pricing'>): PricingRow[] {
  return (yacht.pricing || []).filter((row) => (row.type || 'price') === 'price' && row.price != null);
}

export function hoursFromDuration(duration?: string): number | null {
  if (!duration) {
    return null;
  }
  const match = String(duration).match(/(\d+(?:\.\d+)?)/);
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

function crewRateForBoat(yacht: Yacht, boat: number): number {
  return yacht.crew_rate == null
    ? (boat <= CHARTER_DEPOSIT_THRESHOLD ? FLEET_CREW_RATE_UNDER : FLEET_CREW_RATE)
    : Number(yacht.crew_rate);
}

/** Guest-facing listed total: boat + crew. Deposits are not added on top. */
export function listedTotal(yacht: Yacht, duration?: string): number | null {
  const label = duration || startingTotal(yacht)?.duration || '';
  const boat = tripTotal(yacht, label);
  if (boat == null || boat <= 0) {
    return null;
  }
  const hours = hoursFromDuration(label) || 0;
  return roundMoney(boat + crewRateForBoat(yacht, boat) * hours);
}

export function startingListed(yacht: Yacht): { amount: number; duration: string } | null {
  const start = startingTotal(yacht);
  if (!start) {
    return null;
  }
  const listed = listedTotal(yacht, start.duration);
  return listed == null ? start : { amount: listed, duration: start.duration };
}

export type DockQuote = {
  duration: string;
  tripTotal: number;
  listedTotal: number;
  payNow: number;
  dueAtDock: number;
  depositRate: number;
  wooStale: boolean;
};

export function hourlyDeposit(yacht: Yacht, boat: number, hours: number): number {
  const fuelRate = yacht.fuel_rate == null
    ? (boat <= FUEL_THRESHOLD ? FLEET_FUEL_RATE_UNDER : FLEET_FUEL_RATE)
    : Number(yacht.fuel_rate);
  return roundMoney(fuelRate * hours);
}

export function boatPctDeposit(boat: number): number {
  return boat > CHARTER_DEPOSIT_THRESHOLD ? roundMoney((boat * CHARTER_DEPOSIT_PCT) / 100) : 0;
}

/** Dock = boat − hourly deposit − % boat deposit. Crew is not credited. */
export function dockBalance(boat: number, hourlyDep: number, pctDep: number, extrasLater = 0): number {
  return roundMoney(Math.max(0, boat - hourlyDep - pctDep) + extrasLater);
}

/**
 * pay_now is what Woo charges today (crew + hourly boat deposit, plus a 20%
 * boat deposit over $1,400). Crew is $75/hr at or under $1,400 and $100/hr over.
 * Hourly deposit is $25/hr at or under $800 and $50/hr over.
 * Dock credits deposits only — crew is a reservation fee.
 */
export function chargedToday(yacht: Yacht, duration?: string, wooPayNow?: number | null): number {
  const label = duration || startingTotal(yacht)?.duration || '';
  const total = tripTotal(yacht, label);
  if (total == null || total <= 0) {
    return 0;
  }
  const hours = hoursFromDuration(label) || 0;
  const crewRate = yacht.crew_rate == null
    ? (total <= CHARTER_DEPOSIT_THRESHOLD ? FLEET_CREW_RATE_UNDER : FLEET_CREW_RATE)
    : Number(yacht.crew_rate);
  const crewFuel = roundMoney((crewRate * hours) + hourlyDeposit(yacht, total, hours));
  const resDep = boatPctDeposit(total);
  const suiteNow = roundMoney(crewFuel + resDep);
  const woo = wooPayNow != null ? Number(wooPayNow) : null;
  const wooIsBoat = woo != null && Math.abs(woo - total) <= 1.05 && Math.abs(woo - suiteNow) > 1.05;
  const wooLooksLikeFees = woo != null && woo > 0 && !wooIsBoat && woo <= total + 0.009;
  if (wooLooksLikeFees) {
    return roundMoney(woo);
  }
  if (suiteNow > 0 && suiteNow <= total + suiteNow) {
    return suiteNow;
  }
  return roundMoney(total * DEPOSIT_RATE);
}

export function dockQuote(yacht: Yacht, duration?: string, wooPayNow?: number | null): DockQuote | null {
  const start = startingTotal(yacht);
  const label = duration || start?.duration || '';
  const total = tripTotal(yacht, label);
  if (total == null || total <= 0) {
    return null;
  }
  const woo = wooPayNow != null ? Number(wooPayNow) : null;
  const suiteNow = chargedToday(yacht, label);
  const wooIsBoat = woo != null && Math.abs(woo - total) <= 1.05 && Math.abs(woo - suiteNow) > 1.05;
  const wooOk = woo != null && woo > 0 && !wooIsBoat && woo <= total + 0.009;
  const payNow = chargedToday(yacht, label, wooPayNow);
  const hours = hoursFromDuration(label) || 0;
  return {
    duration: label,
    tripTotal: roundMoney(total),
    listedTotal: roundMoney(total + crewRateForBoat(yacht, total) * hours),
    payNow,
    dueAtDock: dockBalance(total, hourlyDeposit(yacht, total, hours), boatPctDeposit(total)),
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
