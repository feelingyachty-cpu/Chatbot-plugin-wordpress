# Advantage+ campaign experience (2026)

Official developer reference: [Advantage+ Campaign Experience](https://developers.facebook.com/documentation/ads-commerce/marketing-api/advantage-campaigns)

## The 2026 rule

Advantage+ is **not** a separate campaign type you pick at the top of Ads Manager. Meta merged the old “manual vs Advantage+ Shopping” split.

Advantage+ is a **state**. A campaign becomes Advantage+ Sales / App / Leads when all three automation levers are on:

1. Advantage+ campaign budget
2. Advantage+ audience
3. Advantage+ placements

Turn any one off and it is a manual campaign that may still use some Advantage features.

Legacy API fields (`smart_promotion_type=AUTOMATED_SHOPPING_ADS` / `SMART_APP_PROMOTION`) are retired as of Marketing API v25. New work uses `advantage_state_info`.

## What you still control vs what Meta controls

You typically keep:

- Budget size and bid/ROAS/cost goals
- Countries and languages
- Minimum age (up to 25)
- Excluded custom audiences (existing bookers, employees, junk leads)
- Creatives and catalog
- Destination and conversion event

Meta typically takes:

- Gender, max age, interest stacks
- Exact person-level targeting
- How much budget goes to new vs existing customers
- Which creative × placement combination gets the next dollar

## Opportunity Score

Ads Manager now scores setup from 0–100 (audience breadth, creative diversity, budget, tracking, Advantage+ adoption). Treat 80+ as the operating target. It is a setup health score, not a ROAS guarantee.

## When Advantage+ is the right default

Use it when:

- Pixel + CAPI are verified and Event Match Quality is healthy (aim 6+ / 10)
- You can feed at least several distinct creatives (Meta’s own guidance clusters around 8–10+ real variations, not cropped duplicates)
- The offer is broad enough (Miami yacht charter, sunset, birthday, corporate) rather than a one-yacht leftover Tuesday
- You will not babysit interest stacks every morning

Use more manual structure when:

- You must isolate Panama vs Miami legally or financially
- You are testing a brand-new conversion event
- You need a strict existing-customer exclusion that Advantage+ keeps leaking
- Creative is a single static image (fix the creative first)

## Setup checklist

1. Confirm Pixel + CAPI, duplicate event IDs, and the optimization event in Events Manager.
2. Create a standard campaign with the right ODAX objective (Sales or Leads).
3. Leave Advantage+ audience on. Add *suggestions* (lookalikes, site visitors, “yacht charter Miami”) as starting signals, not fences.
4. Leave Advantage+ placements on.
5. Turn on Advantage campaign budget if you have multiple ad sets.
6. Add 3–5 primary texts, 3–5 headlines, and mixed Reels / stills / carousels.
7. Enable Advantage+ creative (safe crops, music on statics, text variations). Review the preview. Ban any unsafe automations (weird overlays on a luxury brand).
8. Exclude employees, test users, and recent bookers if the goal is new demand.
9. Launch. Do not rebuild the campaign on day 3 because CPA moved.

## Holiday 2026 note

Meta’s 2026 holiday guidance: start Advantage+ *before* peak. Black Friday 2026 is November 27 — a short window to Christmas. Meta told SMBs to have ads learning by mid-October. For Feeling Yachty that means Art Basel / NYE / holiday charter campaigns should be in learning in October, not the week of the event.

Sources:

- [Meta holiday marketing guides — Social Media Today](https://www.socialmediatoday.com/news/meta-publishes-holiday-marketing-guides/827856/)
- [Meta 2026 holiday planning guide](https://tech.yahoo.com/social-media/articles/meta-publishes-2026-holiday-planning-173013090.html)
- [Meta holiday tips for small businesses](https://www.socialmediatoday.com/news/meta-shares-holiday-2026-tips-for-small-businesses/826785/)
