# Measurement: Pixel, Conversions API, and how we judge ads

Official: [Events Manager](https://business.facebook.com/events_manager) · [Meta Business Help](https://www.facebook.com/business/help)

## The 2026 standard

Browser Pixel alone is not enough. Safari, ad blockers, and iOS cut the signal. **Pixel + Conversions API (CAPI)** with event deduplication is the required setup.

Dedup rule: same `event_name` + same `event_id` from browser and server. Meta keeps one.

## Events Feeling Yachty should fire

| Event | Where | Why |
| --- | --- | --- |
| PageView | All pages | Baseline |
| ViewContent | Yacht listing / venue pages | Content ID = yacht slug, value = starting rate if known |
| Search | Inventory search | Query + market |
| Contact / Lead | Quote form submit, WhatsApp click, phone click | Primary mid-funnel |
| Schedule | Date requested or calendar hold | Stronger than raw Lead |
| InitiateCheckout | Deposit flow started | |
| Purchase | Deposit or paid booking | Value = amount, currency = USD |

Use standard event names when they fit. Custom events are fine if they are mapped as custom conversions and used consistently.

## Event Match Quality (EMQ)

Send hashed email, phone, first name, last name, city, state, zip, country, external_id, and fbp/fbc when you have them. Aim for EMQ 6+ / 10. Forms that only ask “name and vibe” starve the model.

## What we report (in this order)

1. **Did the event fire?** Events Manager test events + server logs.
2. **Cost per qualified lead** — not cost per instant-form open.
3. **Lead-to-booking rate** from CRM.
4. **Cost per booking** and **ROAS** on deposit value.
5. **Frequency, CTR, thumbstop (3s video), hold rate.**
6. **Incrementality** (Conversion Lift / Experiments) once spend is large enough that last-click lies.

Never optimize a Sales campaign to Link Click. You will buy cheap clicks and no charters.

## Attribution

In-platform results use Meta’s attribution setting (often 7-day click / 1-day view or similar — confirm in Ads Manager). Compare against GA4 and CRM, not against a fantasy of last-click Google-only truth. People see a Reel on Tuesday and search “Feeling Yachty” on Friday.

## Lift and incrementality

When monthly Meta spend is meaningful, run Conversion Lift or a geo holdout. Until then, use CRM: if leads book at a sane rate and incremental inquiries rise when ads are on, keep going.

## Opportunity Score vs vanity

A high Opportunity Score with a broken thank-you page is still a broken campaign. Tracking first, automation second, creative third, bidding last.
