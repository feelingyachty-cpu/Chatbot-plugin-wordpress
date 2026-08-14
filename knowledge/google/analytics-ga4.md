# Google Analytics 4

Official: [Introducing GA4](https://support.google.com/analytics/answer/10089681) · [About events](https://support.google.com/analytics/answer/9322688) · [Mark key events](https://support.google.com/analytics/answer/13128484) · [Set up a property](https://support.google.com/analytics/answer/14183469)

## What GA4 is

An **event-based** property for web + app. Universal Analytics is dead (standard properties stopped July 1, 2023). There are no “sessions as the atom.” Everything is an event with parameters.

Privacy: cookieless measurement, behavioral modeling, consent mode. Predictive metrics exist if event volume qualifies.

## Property setup (Feeling Yachty)

1. One GA4 property for feelingyachty.com (and a separate one only if you truly need a sandbox).
2. Web data stream. Enhanced measurement on (page views, scrolls, outbound clicks, site search, video if applicable, file downloads).
3. Install via **Google Tag Manager** on WordPress, not a tangle of hardcoded snippets.
4. Link Google Ads, Search Console, and (if used) BigQuery.
5. Turn on **debug** with the GA Debugger / DebugView whenever a new event ships.

## Event types

| Type | Examples | We do |
| --- | --- | --- |
| Automatically collected | session_start, first_visit | Nothing |
| Enhanced measurement | page_view, scroll, click | Keep on |
| Recommended | generate_lead, purchase, view_item, begin_checkout | Use these names |
| Custom | whatsapp_click, yacht_filter | Only when recommended names do not fit |

Recommended events unlock advertising reports and some audiences. Prefer `generate_lead` and `purchase` over `form_thing_2`.

## Key events (conversions)

Any event can be marked a key event. Then it can become a Google Ads conversion.

Feeling Yachty key events:

- `generate_lead` (quote)
- `purchase` (deposit)
- `view_item` (yacht page — usually **not** a key event for bidding)
- `whatsapp_click` as secondary

Do not mark `page_view` or `scroll` as key events.

## Parameters we should send

- `item_id` / `item_name` — yacht slug and name
- `item_category` — Miami vs Panama, size band, occasion
- `value` + `currency` on purchase
- `lead_type` — wedding, corporate, birthday, sunset
- `guest_count` if collected

## Reports Nala actually uses

- **Realtime / DebugView** — did it fire?
- **Acquisition → User / Traffic acquisition** — channel grouping vs session source
- **Engagement → Events / Landing page**
- **Monetization** if purchase is implemented
- **Advertising** after Ads link (attribution, conversion paths)
- **Explorations** — funnel: view_item → generate_lead → purchase
- **Search Console reports** in GA4 after linking (must be published from the Library)

## Audiences to build and export to Ads / Meta (via lists or parallel pixels)

- Viewed 2+ yacht pages, no lead, 30 days
- Lead, no purchase, 14 days
- Purchase last 540 days (exclude from prospecting)
- Panama-only page viewers
- High scroll on blog cluster articles (SEO-assisted demand)

## Modeling and consent

If a large share of Miami traffic is iOS Safari, modeled conversions will appear. Do not “correct” them to zero. Fix consent mode and enhanced conversions instead of accusing GA4 of lying.

## Certification map

Skillshop 101–301 + Analytics Certification. This file is the brand-specific layer on top of those modules.
