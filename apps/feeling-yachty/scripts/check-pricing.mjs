/**
 * Systems check: hours must change trip total, deposit, and due-at-the-dock together.
 * Dock is boat − hourly deposit − % boat deposit. Crew is not credited.
 * Run: node apps/feeling-yachty/scripts/check-pricing.mjs
 */
import assert from 'node:assert/strict';

const DEPOSIT_RATE = 0.5;
const FLEET_CREW_RATE = 100;
const FLEET_CREW_RATE_UNDER = 75;
const FLEET_FUEL_RATE = 50;
const FLEET_FUEL_RATE_UNDER = 25;
const FUEL_THRESHOLD = 800;
const CHARTER_DEPOSIT_THRESHOLD = 1400;
const CHARTER_DEPOSIT_PCT = 20;
const roundMoney = (n) => Math.round(n * 100) / 100;

function hoursFromDuration(duration) {
  const m = String(duration || '').match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function tripTotal(yacht, duration) {
  const rows = (yacht.pricing || []).filter((r) => (r.type || 'price') === 'price' && r.price != null);
  const hours = hoursFromDuration(duration);
  const match = rows.find((row) => hoursFromDuration(row.duration) === hours);
  if (match) return Number(match.price);
  return null;
}

function hourlyDeposit(yacht, boat, hours) {
  const fuelRate = yacht.fuel_rate == null
    ? (boat <= FUEL_THRESHOLD ? FLEET_FUEL_RATE_UNDER : FLEET_FUEL_RATE)
    : Number(yacht.fuel_rate);
  return roundMoney(fuelRate * hours);
}

function boatPctDeposit(boat) {
  return boat > CHARTER_DEPOSIT_THRESHOLD ? roundMoney((boat * CHARTER_DEPOSIT_PCT) / 100) : 0;
}

function dockBalance(boat, hourlyDep, pctDep, extrasLater = 0) {
  return roundMoney(Math.max(0, boat - hourlyDep - pctDep) + extrasLater);
}

function chargedToday(yacht, duration, wooPayNow) {
  const total = tripTotal(yacht, duration);
  if (total == null) return 0;
  const hours = hoursFromDuration(duration) || 0;
  const crewRate = yacht.crew_rate == null
    ? (total <= CHARTER_DEPOSIT_THRESHOLD ? FLEET_CREW_RATE_UNDER : FLEET_CREW_RATE)
    : Number(yacht.crew_rate);
  const crewFuel = roundMoney((crewRate * hours) + hourlyDeposit(yacht, total, hours));
  const resDep = boatPctDeposit(total);
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
  const hours = hoursFromDuration(duration) || 0;
  return {
    tripTotal: roundMoney(total),
    payNow,
    dueAtDock: dockBalance(total, hourlyDeposit(yacht, total, hours), boatPctDeposit(total)),
    wooStale: woo != null && !wooOk,
  };
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
assert.equal(q3.payNow, 300); // $75 crew + $25 deposit × 3
assert.equal(q3.dueAtDock, 255); // 330 − 75
assert.equal(q3.wooStale, true);

const q4 = dockQuote(sundeck, '4 Hours');
assert.equal(q4.tripTotal, 440);
assert.equal(q4.payNow, 400); // $75 + $25 × 4
assert.equal(q4.dueAtDock, 340); // 440 − 100

const q8 = dockQuote(sundeck, '8 Hours');
assert.equal(q8.tripTotal, 880);
assert.equal(q8.payNow, 440); // crew+deposit $1000 does not fit; 50% fallback
assert.equal(q8.dueAtDock, 480); // 880 − $50/hr × 8

const lime = {
  pricing: [{ type: 'price', duration: '3 Hours', price: 10749.99 }],
};
const ql = dockQuote(lime, '3 Hours', 2675);
assert.equal(ql.tripTotal, 10749.99);
assert.equal(ql.payNow, 2675);
assert.equal(ql.dueAtDock, 8449.99); // 10749.99 − 150 − 2150
assert.equal(ql.wooStale, false);

assert.equal(hoursFromDuration('4 Hours + 1 Free Hour'), 4);
assert.equal(hoursFromDuration('3.5 Hours'), 3.5);
assert.equal(tripTotal(sundeck, 'price × 4 hours') ?? tripTotal(sundeck, '4 Hours'), 440);

const coco = {
  pricing: [
    { type: 'price', duration: '3 Hours', price: 855 },
    { type: 'price', duration: '4 Hours', price: 1140 },
    { type: 'price', duration: '5 Hours', price: 1425 },
  ],
};
const c4 = dockQuote(coco, '4 Hours', 500);
assert.equal(c4.tripTotal, 1140);
assert.equal(c4.payNow, 500);
assert.equal(c4.dueAtDock, 940);

const listed = (yacht, duration) => {
  const boat = tripTotal(yacht, duration);
  const hours = hoursFromDuration(duration) || 0;
  const crewRate = boat <= CHARTER_DEPOSIT_THRESHOLD ? FLEET_CREW_RATE_UNDER : FLEET_CREW_RATE;
  return roundMoney(boat + crewRate * hours);
};
assert.equal(listed(coco, '3 Hours'), 1080); // 855 + 225
assert.equal(listed(coco, '4 Hours'), 1440); // 1140 + 300
assert.equal(listed(sundeck, '3 Hours'), 555); // 330 + 225
assert.equal(c4.wooStale, false);

const c4suite = dockQuote(coco, '4 Hours');
assert.equal(c4suite.payNow, 500);
assert.equal(c4suite.dueAtDock, 940);

const c5 = dockQuote(coco, '5 Hours', 1035);
assert.equal(c5.tripTotal, 1425);
assert.equal(c5.payNow, 1035);
assert.equal(c5.dueAtDock, 890);

// Card formula: boat − hourly deposit − % boat deposit. Deposit is $25 under $800, else $50.
const suiteDock = (boat, hourlyDep, resDep, extrasLater) =>
  Math.round((Math.max(0, boat - hourlyDep - resDep) + extrasLater) * 100) / 100;
assert.equal(suiteDock(1140, 200, 0, 0), 940);
assert.equal(suiteDock(1425, 250, 285, 0), 890);
assert.equal(suiteDock(330, 75, 0, 0), 255);

console.log('pricing systems check ok');
