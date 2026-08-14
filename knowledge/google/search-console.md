# Google Search Console

Official: [About Search Console](https://support.google.com/webmasters/answer/9128668) · [Search Console](https://search.google.com/search-console) · [Search Central](https://developers.google.com/search/docs)

There is no Skillshop “GSC certification.” This is the operating manual.

## What it is for

Free Google tool to see how Search sees feelingyachty.com:

- Can Google crawl and index the page?
- Which queries show us, at what position, CTR, and clicks?
- Which pages get impressions?
- Enhancements / structured data issues
- Backlinks (sample)
- Manual actions and security issues
- Core Web Vitals / page experience (as reported)

You do not need GSC to *be* in Search. You need it to *operate* Search.

## Who uses it here

- **Fernando / marketing:** queries, CTR, which yacht pages deserve ads + social support
- **SEO / content:** the Miami and Panama blog clusters already planned in Drive
- **Dev / WordPress:** coverage errors, canonicals, sitemap, robots, CWV
- **Nala:** turn query data into ad negatives, RSA headlines, and social captions. File the resulting keyword/creative cards to Pac-Man.

## Setup

1. Verify the property (URL-prefix `https://feelingyachty.com/` and/or Domain property).
2. Submit the sitemap (`/sitemap.xml` or Yoast/RankMath equivalent).
3. Confirm no accidental `noindex` on money pages.
4. Link GA4 and Google Ads.
5. Add all users who need it. Do not share one login.

## Reports that change decisions

| Report | Decision |
| --- | --- |
| Performance → Queries | RSA headlines, blog titles, ad keyword list, negatives |
| Performance → Pages | Which listings to push on social this week |
| Performance → Countries | US vs PA vs tourist origin countries |
| Performance → Devices | Mobile page fixes |
| Indexing / Pages | Fix 404s, soft 404s, duplicates, redirected leftovers |
| Experience / CWV | Speed on listing templates |
| Enhancements | Product, FAQ, Event, Video markup if we add it |
| Links | Partnership and PR targets |
| Removals | Emergency only |

## Feeling Yachty query clusters (expected)

- miami yacht rental / charter / party boat / sunset cruise
- wedding yacht miami, corporate yacht miami, bachelor yacht miami
- size modifiers: 20 person, 50 person, 110 ft
- panama / san blas yacht
- branded: feeling yachty

If branded CTR is low, the title/meta is wrong. If generic “yacht rental miami” impressions are high and CTR is low, the snippet is losing to competitors — fix title, price hint, and reviews. If impressions are near zero, it is an index or authority problem, not a caption problem.

## Inspections

Use URL Inspection before asking “why isn’t this ranking?”:

- Indexed or not
- Canonical Google chose
- Last crawl
- Mobile usability
- Structured data detected

Request indexing after a real content change, not after every comma.

## How GSC feeds ads and social

- High-impression, low-CTR queries → new RSA headlines and a Reel hook
- Queries with bookings (from GA4 landing pages) → exact/phrase Search keywords
- Queries that never convert → negatives
- Pages that rank but have no Reel → content assignment for the week
