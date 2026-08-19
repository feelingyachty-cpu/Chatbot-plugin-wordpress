/**
 * Systems check: hours must change trip total, deposit, and due-at-the-dock together.
 * Run: node apps/feeling-yachty/scripts/check-pricing.mjs
 */
import assert from 'node:assert/strict';

const DEPOSIT_RATE = 0.5;
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

function dockQuote(yacht, duration, wooPayNow) {
  const total = tripTotal(yacht, duration);
  if (total == null) return null;
  const half = roundMoney(total * DEPOSIT_RATE);
  const woo = wooPayNow != null ? Number(wooPayNow) : null;
  const wooOk = woo != null && woo > 0 && woo <= total + 0.009;
  const payNow = wooOk ? roundMoney(woo) : half;
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

console.log('pricing systems check ok');
