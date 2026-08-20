/**
 * Systems check: hours must change trip total, deposit, and due-at-the-dock together.
 * Dock is boat − % boat deposit. Crew and fuel are real charges on top of the
 * boat — neither is credited, so payNow + dueAtDock = boat + crew + fuel
 * (the 20% boat deposit over $1,400 is still credited toward the boat).
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
  // "Pay for 4 Hours Get 5 Hours Total" is a 5-hour charter — mirror the
  // Suite's hours_from_label() "get N hours" precedence.
  const bonus = String(duration || '').match(/get\s+(\d+(?:\.\d+)?)\s*hour/i);
  if (bonus) return Number(bonus[1]);
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

function dockBalance(boat, pctDep, extrasLater = 0) {
  return roundMoney(Math.max(0, boat - pctDep) + extrasLater);
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
  const wooIsBoat = woo != null && Math.abs(woo - total) <= 1.05 && Math.abs(woo - suiteNow) > 1.05;
  const wooLooksLikeFees = woo != null && woo > 0 && !wooIsBoat && woo <= total + 0.009;
  if (wooLooksLikeFees) return roundMoney(woo);
  if (suiteNow > 0) return suiteNow;
  return roundMoney(total * DEPOSIT_RATE);
}

function dockQuote(yacht, duration, wooPayNow) {
  const total = tripTotal(yacht, duration);
  if (total == null) return null;
  const woo = wooPayNow != null ? Number(wooPayNow) : null;
  const suiteNow = chargedToday(yacht, duration);
  const wooIsBoat = woo != null && Math.abs(woo - total) <= 1.05 && Math.abs(woo - suiteNow) > 1.05;
  const wooOk = woo != null && woo > 0 && !wooIsBoat && woo <= total + 0.009;
  const payNow = chargedToday(yacht, duration, wooPayNow);
  const hours = hoursFromDuration(duration) || 0;
  return {
    tripTotal: roundMoney(total),
    payNow,
    dueAtDock: dockBalance(total, boatPctDeposit(total)),
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
assert.equal(q3.dueAtDock, 330); // full boat — fuel is not credited
assert.equal(q3.wooStale, true);

const q4 = dockQuote(sundeck, '4 Hours');
assert.equal(q4.tripTotal, 440);
assert.equal(q4.payNow, 400); // $75 + $25 × 4
assert.equal(q4.dueAtDock, 440); // full boat — fuel is not credited

const q8 = dockQuote(sundeck, '8 Hours');
assert.equal(q8.tripTotal, 880);
assert.equal(q8.payNow, 1000); // $75 crew + $50 deposit × 8; crew is not capped by the boat
assert.equal(q8.dueAtDock, 880); // full boat — fuel is not credited

const lime = {
  pricing: [{ type: 'price', duration: '3 Hours', price: 10749.99 }],
};
const ql = dockQuote(lime, '3 Hours', 2675);
assert.equal(ql.tripTotal, 10749.99);
assert.equal(ql.payNow, 2675);
assert.equal(ql.dueAtDock, 8599.99); // 10749.99 − 2150 pct deposit only
assert.equal(ql.wooStale, false);

assert.equal(hoursFromDuration('4 Hours + 1 Free Hour'), 4);
assert.equal(hoursFromDuration('3.5 Hours'), 3.5);
assert.equal(hoursFromDuration('Pay for 4 Hours Get 5 Hours Total'), 5); // Suite hours_from_label parity
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
assert.equal(c4.dueAtDock, 1140); // full boat — fuel is not credited

// Listed price = the BOAT price only (the original spreadsheet figure).
// Crew + fuel and the 20% deposit are checkout fees, never in the listing.
const listed = (yacht, duration) => roundMoney(tripTotal(yacht, duration));
assert.equal(listed(coco, '3 Hours'), 855); // boat only
assert.equal(listed(coco, '4 Hours'), 1140); // boat only
assert.equal(listed(coco, '5 Hours'), 1425); // boat only
assert.equal(listed(sundeck, '3 Hours'), 330); // boat only

// Live Coco Hours on 2026-08-19 (boat rows, not the older $855/$1140 set).
const cocoLive = {
  pricing: [
    { type: 'price', duration: '3 Hours', price: 1100 },
    { type: 'price', duration: '4 Hours', price: 1350 },
    { type: 'price', duration: '5 Hours', price: 1700 },
  ],
};
assert.equal(listed(cocoLive, '3 Hours'), 1100); // boat only
assert.equal(listed(cocoLive, '4 Hours'), 1350); // boat only
assert.equal(listed(cocoLive, '5 Hours'), 1700); // boat only

// Barbie (live From $717) — Woo leftover is the boat, not fees.
const barbie = {
  pricing: [{ type: 'price', duration: '3 Hours', price: 717 }],
};
assert.equal(listed(barbie, '3 Hours'), 717); // boat only

// A per-yacht crew override wins on both sides of the $1,400 band.
const crewOverride = { crew_rate: 150, pricing: [{ type: 'price', duration: '3 Hours', price: 717 }] };
assert.equal(listed(crewOverride, '3 Hours'), 717); // boat only — fees never in the listing
assert.equal(chargedToday(crewOverride, '3 Hours'), 525); // 150 crew + 25 fuel × 3
assert.equal(chargedToday(barbie, '3 Hours', 717), 300); // $75 crew + $25 deposit × 3
assert.equal(dockQuote(barbie, '3 Hours', 717).payNow, 300);
assert.equal(dockQuote(barbie, '3 Hours', 717).dueAtDock, 717); // full boat — fuel is not credited
assert.equal(dockQuote(barbie, '3 Hours', 717).wooStale, true);
assert.equal(c4.wooStale, false);

const c4suite = dockQuote(coco, '4 Hours');
assert.equal(c4suite.payNow, 500);
assert.equal(c4suite.dueAtDock, 1140);

const c5 = dockQuote(coco, '5 Hours', 1035);
assert.equal(c5.tripTotal, 1425);
assert.equal(c5.payNow, 1035);
assert.equal(c5.dueAtDock, 1140); // 1425 − 285 pct deposit

// Card formula: boat − % boat deposit. Fuel and crew are never credited.
const suiteDock = (boat, resDep, extrasLater) =>
  Math.round((Math.max(0, boat - resDep) + extrasLater) * 100) / 100;
assert.equal(suiteDock(1140, 0, 0), 1140);
assert.equal(suiteDock(1425, 285, 0), 1140);
assert.equal(suiteDock(330, 0, 0), 330);

console.log('pricing systems check ok');
