# Google Ads campaign types (operating knowledge)

Official Help: [support.google.com/google-ads](https://support.google.com/google-ads)

## Account structure

Account → Campaign → Ad group → Ads + assets.

- **Campaign:** goal, budget, network, geo, language, bidding
- **Ad group:** tight theme (one intent). “Miami sunset charter” is an ad group. “All yachts everywhere” is not
- **Ads:** Responsive Search Ads (RSA) for Search. Demand Gen / Video use product-native creatives
- **Assets** (formerly extensions): sitelinks, call, callouts, structured snippets, images, prices, locations

Call-only ads are retired. Use RSA + call assets.

## Search campaigns

Use when someone already wants the thing.

**Match types**

- Exact `[yacht rental miami]`
- Phrase `"yacht rental miami"`
- Broad: only with strong negatives + Smart Bidding + conversion volume

**Quality Score** (1–10) = expected CTR + ad relevance + landing page experience. It changes CPC. The landing page is part of the bid.

**RSA:** 8–15 headlines, 3–4 descriptions, pin only when legally required (price, location). Let the system mix.

**Negatives:** cheap, free, jobs, craigslist, sinking, pirate, “how to steal a yacht,” competitor terms we will not pay for, Panama terms inside Miami campaigns and the reverse.

**Bidding:** start Maximize conversions once tracking works; add a tCPA when you know CPA; tROAS only with clean values. Manual CPC is a diagnostic tool, not a 2026 growth plan.

## Performance Max (PMax)

One campaign across Search, YouTube, Display, Discover, Gmail, Maps.

2026 controls that matter:

- Campaign-level negatives
- Brand exclusions
- Device and demographic exclusions
- New-customer mode
- Asset-group reporting (still not fully Search-transparent — read Search term insights + channel performance)

PMax needs:

- Conversion tracking with value
- Asset groups by theme (Miami sunset vs wedding vs Panama)
- A real audience signal (GA4 purchasers, customer match)
- Final URLs that can take the click (listing pages, not a 12-second homepage video)

Do not run PMax as the *only* campaign until Search brand + non-brand are understood. Otherwise PMax eats branded queries and looks like a genius.

## Demand Gen

Creative-led, YouTube / Shorts / Discover / Gmail / Display. This is Google’s answer to Meta/TikTok prospecting. Needs vertical video. Optimize to a conversion or at least a qualified engagement, not raw views.

## Video / YouTube

- Skippable in-stream, in-feed, Shorts
- Use for demand *creation* (the skyline Reel) and then Search captures
- YouTube Live Practice Mode (2026) is for organic creators; ads still need YouTube campaign types

## Display

Remarketing first. Cold Display for a $2k–$20k charter is usually a leak unless creative is outstanding and frequency is capped.

## Shopping / Merchant Center

Only if packages have reliable price, image, GTIN-or-equivalent, and availability. A yacht is not a toaster. If we do this, treat “Sunset cruise 2hr up to 12 guests” as the product, not the hull.

## Geo and language

- Miami campaigns: Miami metro + destination modifiers in copy
- National US with “Miami” in the query is valid for destination charters
- Panama: separate campaigns, Spanish + English as data justifies
- Device bid adjustments exist; most booking research is mobile. Confirm in GA4. Landing pages must be mobile-first.

## 2026 AI surfaces

Google has been rolling **Ads Advisor** and **Analytics Advisor** inside the products. Use them as assistants, not as the media buyer. They are good at spotting broken conversion actions and odd CPA spikes. They are bad at knowing that “cheap yacht miami” buyers never close.

## Brand protection

Always keep a small **brand Search** campaign: feeling yachty, feelingyachty, misspellings. Exact and phrase. Do not let competitors or PMax own the name.
