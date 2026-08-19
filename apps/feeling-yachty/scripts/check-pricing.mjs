/**
 * Systems check: hours must change trip total, deposit, and due-at-the-dock together.
 * Dock is boat − today’s payment. Run: node apps/feeling-yachty/scripts/check-pricing.mjs
 */
import assert from 'node:assert/strict';

const DEPOSIT_RATE = 0.5;
const FLEET_CREW_RATE = 100;
const FLEET_FUEL_RATE = 75;
const CHARTER_DEPOSIT_THRESHOLD = 1400;
const CHARTER_DEPOSIT_PCT = 20;
const roundMoney = (n) => Math.round(n * 100) / 100;

function hoursFromDuration(duration) {
  const m = String(duration || '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function tripTotal(yacht, duration) {
  const rows = (yacht.pricing || []).filter((r) => (r.type || 'price') === 'price' && r.price != null);
  const hours = hoursFromDuration(duration);
  const match = rows.find((row) => hoursFromDuration(row.duration) === hours);
  if (match) return Number(match.price);
  return null;
}

function chargedToday(yacht, duration, wooPayNow) {
  const total = tripTotal(yacht, duration);
  if (total == null) return 0;
  const hours = hoursFromDuration(duration) || 0;
  const crewRate = yacht.crew_rate == null ? FLEET_CREW_RATE : Number(yacht.crew_rate);
  const fuelRate = yacht.fuel_rate == null ? FLEET_FUEL_RATE : Number(yacht.fuel_rate);
  const crewFuel = roundMoney((crewRate + fuelRate) * hours);
  const resDep = total > CHARTER_DEPOSIT_THRESHOLD ? roundMoney((total * CHARTER_DEPOSIT_PCT) / 100) : 0;
  const suiteNow = roundMoney(crewFuel + resDep);
  const woo = wooPayNow != null ? Number(wooPayNow) : null;
  const fits = (amount) => amount > 0 && amount <= total + 0.009;
  if (woo != null && fits(woo)) return roundMoney(woo);
  if (fits(suiteNow)) return suiteNow;
  return roundMoney(total * DEPOSIT_RATE);
}

function dockQuote(yacht, duration, wooPayNow) {
  const total = tripTotal(yacht, duration);
  if (total == null) return null;
  const woo = wooPayNow != null ? Number(wooPayNow) : null;
  const wooOk = woo != null && woo > 0 && woo <= total + 0.009;
  const payNow = chargedToday(yacht, duration, wooPayNow);
  return { tripTotal: roundMoney(total), payNow, dueAtDock: roundMoney(total - payNow), wooStale: woo != null && !wooOk };
}

const sundeck = {
  pricing: [
    { type: 'price', duration: '3 Hours', price: 330 },
    { type: 'price', duration: '4 Hours', price: 440 },
    { type: 'price', duration: '8 Hours', price: 880 },
  ],
};

const q3 = dockQuote(sundeck, '3 Hours', 525); // cloned Woo $525 is stale
assert.equal(q3.tripTotal, 330);
assert.equal(q3.payNow, 165);
assert.equal(q3.dueAtDock, 165);
assert.equal(q3.wooStale, true);

const q4 = dockQuote(sundeck, '4 Hours');
assert.equal(q4.tripTotal, 440);
assert.equal(q4.payNow, 220);
assert.equal(q4.dueAtDock, 220);

const q8 = dockQuote(sundeck, '8 Hours');
assert.equal(q8.tripTotal, 880);
assert.equal(q8.payNow, 440);
assert.equal(q8.dueAtDock, 440);

const lime = {
  pricing: [{ type: 'price', duration: '3 Hours', price: 10749.99 }],
};
const ql = dockQuote(lime, '3 Hours', 2675);
assert.equal(ql.tripTotal, 10749.99);
assert.equal(ql.payNow, 2675);
assert.equal(ql.dueAtDock, 8074.99);
assert.equal(ql.wooStale, false);

assert.equal(hoursFromDuration('4 Hours + 1 Free Hour'), 4);
assert.equal(tripTotal(sundeck, 'price × 4 hours') ?? tripTotal(sundeck, '4 Hours'), 440);

const coco = {
  pricing: [
    { type: 'price', duration: '3 Hours', price: 855 },
    { type: 'price', duration: '4 Hours', price: 1140 },
    { type: 'price', duration: '5 Hours', price: 1425 },
  ],
};
const c4 = dockQuote(coco, '4 Hours', 700);
assert.equal(c4.tripTotal, 1140);
assert.equal(c4.payNow, 700);
assert.equal(c4.dueAtDock, 440);
assert.equal(c4.wooStale, false);

const c4suite = dockQuote(coco, '4 Hours');
assert.equal(c4suite.payNow, 700);
assert.equal(c4suite.dueAtDock, 440);

const c5 = dockQuote(coco, '5 Hours', 1160);
assert.equal(c5.tripTotal, 1425);
assert.equal(c5.payNow, 1160);
assert.equal(c5.dueAtDock, 265);

// Suite 3.73.4 card formula after our patch: boat − (crew + fuel + resDep).
const suiteDock = (boat, crew, fuel, resDep, extrasLater) =>
  Math.round((Math.max(0, boat - crew - fuel - resDep) + extrasLater) * 100) / 100;
assert.equal(suiteDock(1140, 400, 300, 0, 0), 440);
assert.equal(suiteDock(1425, 500, 375, 285, 0), 265);

console.log('pricing systems check ok');
