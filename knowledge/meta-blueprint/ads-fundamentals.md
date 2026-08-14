# Meta advertising fundamentals

Official help: [facebook.com/business/help](https://www.facebook.com/business/help)

## Accounts and access

- **Meta Business Manager / Business Settings** owns the business, people, Pages, ad accounts, pixels, catalogs, and WhatsApp.
- **Ad account** is where spend happens. One business can have multiple ad accounts. Never run client or test spend in the production charter account.
- **Facebook Page + Instagram professional account** must be connected before most placements will deliver.
- **Meta Business Suite** is for organic publishing and inbox. **Ads Manager** is for paid. Do not boost random posts as a substitute for a structured campaign unless the goal is truly a single organic post amplification test.

## The auction

Meta does not give the ad slot to the highest bidder. It estimates **total value**:

`bid × estimated action rate × ad quality / user value`

That is why a cheaper, more relevant creative can beat a higher bid. Quality and expected engagement are not optional polish. They are the bid.

## Three-level structure (still true in 2026)

| Level | You decide | Locked after publish? |
| --- | --- | --- |
| Campaign | Objective (ODAX), Advantage campaign budget on/off, special ad category, spend limits | Objective cannot be changed |
| Ad set | Audience signals, placements, schedule, optimization event, bid strategy, budget if CBO is off | Mostly editable; edits can reset learning |
| Ad | Identity, format, creative, copy, CTA, destination URL, tracking | Editable; heavy edits reset learning |

Do not build 20 ad sets “to be scientific” on a small charter budget. Fewer, cleaner structures beat fragmented learning.

## ODAX objectives and when Feeling Yachty uses them

| Objective | Optimize toward | Use for us |
| --- | --- | --- |
| Awareness | Reach, impressions, ad recall | Brand weeks, Art Basel / F1 presence, new market (Panama) |
| Traffic | Landing page views, link clicks | Blog clusters, yacht listing pages — only if the page converts |
| Engagement | ThruPlay, engagement, messages | Reels that should get saved/shared; weak as a booking objective |
| Leads | Instant forms, Messenger, Instagram, WhatsApp, website leads | High-intent “Get a quote” with a tight form (date, headcount, occasion) |
| App promotion | App events | Not used unless we ship an app |
| Sales | Purchase, initiate checkout, add to cart, or website custom event | Primary once Pixel/CAPI can see a booking or deposit |

Default for Feeling Yachty once tracking is live: **Leads** (quote form / WhatsApp) and **Sales** (deposit / checkout) in separate campaigns. Do not mix “get famous” and “get deposits” in one campaign.

## Budgets

- **Advantage campaign budget (CBO)** lets Meta shift spend to the ad sets that are winning. Preferred when you have 2+ ad sets and trust the signal.
- **Ad set budgets** when you must force spend onto a market (Miami vs Panama) or an offer (sunset vs corporate).
- Daily budget is a target, not a hard cap. Lifetime budget is a hard-ish cap across the dates.
- Learning phase needs enough conversion volume. A $10/day Sales campaign with a $2,000 charter CPA will never exit learning. Either raise budget, optimize to a higher-funnel event (Lead, Schedule), or accept it is a prospecting test.

## Bid strategies (practical)

- **Highest volume** — default. Get the most of the chosen event.
- **Cost per result goal** — when you know a max CPA (example: $80 per qualified quote).
- **ROAS goal** — only after purchase value is passing correctly. Do not set a 8x ROAS goal on a cold account.
- **Bid cap / cost cap** — advanced control. Easy to starve delivery if set from guesswork.

## Delivery and learning

- New or heavily edited ads enter learning.
- Significant edits: bid, targeting, creative, optimization event, budget swings.
- Wait for ~50 optimization events per ad set per week before judging, or 7 days, whichever is more honest for the budget.
- Kill on *creative* fatigue (frequency up, CTR down, CPA up), not on day-2 noise.

## Naming convention for this account

`FY | [Market] | [Objective] | [Offer] | [YYYY-MM]`

Examples:

- `FY | Miami | Leads | Sunset Quote | 2026-08`
- `FY | Miami | Sales | Weekend Deposit | 2026-11`
- `FY | Panama | Awareness | San Blas Reels | 2026-09`

Ad set: audience or signal (`Lookalike-bookers-1%`, `Advantage+`, `Interest-yacht`).
Ad: format + hook (`Reel-captain-safety`, `Carousel-110ft-Hargrave`).
