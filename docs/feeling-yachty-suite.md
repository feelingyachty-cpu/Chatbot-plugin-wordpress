# Feeling Yachty Suite — how it works

**Living document.** Update this file on every Suite upgrade, shortcode change, REST change, or UI change.  
Last reviewed: **2026-08-14** against production **feeling-yachty-suite 3.65.0** on feelingyachty.com.

The PHP zip for 3.65.0 is not yet in this git repo. This file is the source of truth for *behavior we can see live*. When the plugin source is added, fill in the “Source map” and “Shortcodes (PHP names)” sections from the actual files.

---

## What this plugin is

Feeling Yachty Suite is the **fleet + storefront plugin** for FeelingYachty.com. It is how the business:

- Sees and edits yachts (admin CPT `fy_yacht`)
- Adds yachts and syncs each one to a WooCommerce product
- Renders catalog / listing / product UI (the `fy-*` design system)
- Stores hourly charter pricing, pink-fleet flags, free-hour deals, badges, marinas, reviews
- Exposes a public REST API (`fy/v1`) for n8n, price push, and the site chatbot
- Sends signed webhooks for bookings and support tickets into GoHighLevel

It is **not** the chatbot. The chatbot in this repo (`feeling-yachty-chatbot`) *reads* Suite. Do not merge the two plugins.

---

## How a yacht exists (data flow)

```
Admin adds/edits fy_yacht
        │
        ├─ taxonomies: fy_yacht_cat (fleet), fy_yacht_tag
        ├─ meta: size, capacity, pricing rows, marina, badges, SEO, add-ons
        │
        ├─ paired WooCommerce product (product_id / product_url)
        │     product content is a stub: <!--fy-auto-->
        │     Suite injects the real product-page UI at render time
        │
        └─ public JSON: GET /wp-json/fy/v1/yachts
              used by n8n price push, Mom Bot listings, this chatbot
```

**Two Miami fleets currently coexist** (do not collapse them without an owner decision):

| `fy_yacht_cat` slug | Count (2026-08-14) | Role |
| --- | --- | --- |
| `miami-yacht-rental` | 178 | Current public catalog (also `/fleet/miami/{slug}/`) |
| `miami-yacht-rentals` | 49 | Older Miami list |
| `panama-yacht-rentals` | 0 on `fy_yacht` | Panama boats still live mainly on `panama_fleet` / `/fleet/panama-yachts/` pages |

Legacy listing CPTs still exist beside Suite (`miami-yacht-rentals`, `panama_fleet`, `miami-mega-yachts`, …). Suite’s own CPT is `fy_yacht`.

---

## Yacht record (fy/v1)

Every published yacht in `GET /wp-json/fy/v1/yachts` has these fields. Treat this as the contract. If an upgrade adds/renames a field, update this table.

| Field | Meaning |
| --- | --- |
| `id` | `fy_yacht` post ID |
| `title` | Public name |
| `status` | Usually `publish` |
| `size_ft` | Length |
| `capacity_max` | Guest cap (Miami private boats are often 13) |
| `special_desc` | Marketing blurb |
| `price` | Starting **hourly** number (not always the charter total) |
| `duration_label` | Label for the starting price (e.g. `3 Hours`) |
| `price_note` | Human note (`4-hour weekday charter`, `5 hours total (pay for 4)`) |
| `pricing[]` | Duration table. Row `type` is `price`, `heading`, or `note` |
| `year`, `brand`, `model` | Specs |
| `captain_included` | Bool |
| `sku`, `source_listing_id`, `source_owner` | BookMyBoat / owner sync |
| `image_url` | Card image |
| `button_url` / `product_url` | Public listing / Woo URL |
| `product_id` | Linked Woo product |
| `is_pink` | Pink fleet |
| `is_free_hour` | Pay-N-get-(N+1) deal |
| `weekend_surcharge`, `crew_rate`, `fuel_rate`, `service_fee` | Extra money fields (often empty; weekend can also be a `pricing` note) |
| `blackout_dates` | Unbookable dates |
| `disabled_addons` / `custom_addons` | Per-yacht add-on overrides (empty on the 200-yacht dump of 2026-08-14) |
| `gallery_id` | `fy_gallery` CPT (none attached on that dump) |
| `reviews[]` | `{name, rating, date, text, source, user_id, order_id, item_id}` |
| `search_terms` | Extra match text for filters |
| `badges[]` | `{style, text}` — styles seen: `hot`, `pink`, `free` |
| `categories[]` | Fleet slugs |
| `tags[]` | Year, brand, marina, type |
| `marina` | `{title, address, lat, lng, embed, google, note}` |
| `seo` | Rank Math / on-page fields (mostly empty; hubs still emit schema) |
| `edit_url` | Admin edit (null when unauthenticated) |

### `pricing[]` rows

- `type: price` — `{duration, price, free}`  
  Durations seen: `2 Hours` … `8 Hours`, `4 Hours + 1 Free Hour`, `Pay for 4 Hours Get 5 Hours Total`, etc.
- `type: heading` — weekday vs weekend blocks (e.g. Monday–Thursday)
- `type: note` — e.g. `Weekend surcharge — $150`

**Rule for any bot or price push:** quote the matching `pricing[]` row. Do not invent a total from `price × hours` unless no row exists.

### Badges seen live

`Pink Yacht`, `+1 Free Hour`, `Theme Party Ready`, `Bachelorette Favorite`, `Value Pick`, `Party Yacht`, `Popular Choice`, `New Yacht`, `Guest Favorite`, `Barbie Theme`, `Slide Available`, `Photo-Ready`, `Great For Groups`.

---

## REST API (`fy/v1`)

Base: `https://feelingyachty.com/wp-json/fy/v1`

| Method | Path | Auth | Use |
| --- | --- | --- | --- |
| GET | `/yachts` | public | Full fleet dump (200 returned on 2026-08-14) |
| GET/POST | `/yachts/{id}` | write needs WP app password | n8n “Update WP Yacht Price” POSTs `{price}` |
| GET | `/fleets` | public | Fleet list + counts |
| GET/POST | `/fleets/{slug}/yachts` | public GET | One fleet |
| GET | `/marinas` | public | 58 marina records (`key`, name, lat/lng, address, note) |
| GET | `/tickets` | **401 public** | Support tickets |
| GET | `/bookings` | **401 public** | Charter bookings |
| GET | `/customers` | **401 public** | Customers |

n8n credential `Wordpress account` (`KGm37ZnRNDgXh023`) is how price push authenticates.

Related namespace (separate plugin or Suite module): `fy-support-bot/v1` — `POST /chat`, `/test-connection`, `/coach`.

---

## Webhooks (Suite → n8n → GHL)

Documented in n8n as **WEBHOOKS.md, plugin v2.6.0+**. Still active on 3.65.0.

WordPress POSTs a signed body to the “Feeling Yachty - WordPress to GHL Sync” webhook.

| Header | HMAC |
| --- | --- |
| `x-signature` or `x-fy-signature` | SHA-256 of the **raw** body |

| `event` | What n8n does |
| --- | --- |
| `booking.paid` | Upsert GHL contact + booking note (yacht, date, time, duration, guests, totals, marina) + Google Chat |
| `ticket.created` | Upsert contact + task/note + Google Chat |
| `ticket.reply` | Upsert contact + email the latest reply. No Chat ping |

Failed deliveries land in the Suite **Activity Log**. No automatic retries. `/bookings` `/tickets` `/customers` are the reconciliation poll.

Do not commit the HMAC secret into git.

---

## WooCommerce product pages

Suite pairs each yacht to a product:

- Product body in REST is only `<!--fy-auto-->`.
- At render time Suite (or its shortcodes) injects the listing UI: gallery, duration prices, badges, CTAs, map.
- `product_url` / `button_url` is what guests book from.

When you change product-page shortcodes or the `fy-auto` injector, document the shortcode names and the template hooks here.

---

## Storefront UI (the `fy-*` design system)

Hub pages (`/miami-yacht-rental/`, `/miami-pink-yacht-rentals/`, `/panama-yacht-rentals/`) are large HTML blobs of Suite components plus schema.org. This is the visualization layer.

### Catalog cards

`fy-card` → `fy-card-media` / `fy-card-image` → `fy-card-title` / `fy-card-subtitle` → `fy-starting-price` (`fy-starting-label`, `fy-starting-amount`, `fy-starting-note`) → expandable `fy-pricing-details` / `fy-price-panel` with `fy-price-row` (`fy-price-duration`, `fy-price-value`, `fy-price-total`) → `fy-card-cta` / `fy-card-button`.

Also: `fy-save-toggle` (save/heart), `fy-photo-open` (lightbox), `fy-badge` / `fy-badge-row`.

### Filters and search

`fy-miami-yacht-search-1`, `fy-miami-yacht-size-1`, `fy-miami-yacht-sort-1`, `fy-filter-button`, `fy-chip-filter`, `fy-clear-filters`, `fy-miami-no-results-1`.

Data attributes used by JS: `data-fy-event`, `data-fy-name`, `data-fy-url`, `data-fy-photos`, `data-fy-price-label`, `data-fy-save`, `data-fy-no-results`.

### Listing extras

Maps (`fy-map`, `fy-gps`), FAQ accordion (`fy-qa`, `fy-q`, `fy-ans`, `fy-acc`), destination clusters, marina lists, WhatsApp / call / schedule buttons (`fy-btn--accent`, `fy-btn--dark`, `fy-btn-wa`).

### Schema the Suite (or companion SEO) emits

Organization, Service, ItemList of boats, Offer prices, FAQPage, Boat, Place/marina, CommunicateAction (WhatsApp). Pink hub also emits Offer blocks per pink yacht.

If an upgrade changes class names, data attributes, or schema `@id`s, list the diff in the changelog below — front-end CSS and the chatbot cards depend on this.

---

## Shortcodes (PHP names)

**Not yet confirmed from source.** Rendered HTML does not keep the `[shortcode]` text.

When the 3.65.0 zip is in the repo, inventory every `add_shortcode(` here. Expected families (from live UI + owner description):

- Fleet / card grids on hub pages
- Single-yacht block on Woo product pages (`fy-auto` injector)
- Duration price table
- Badge row
- Marina / map
- Gallery / lightbox
- Filter / search bar
- FAQ / accordion
- CTA (WhatsApp, call, book)

---

## Admin (how you add a yacht)

Confirmed from CPT + API (fill click-path from source later):

1. WP Admin → **Yachts** (`fy_yacht`)
2. Title, featured image, category = fleet (`miami-yacht-rental` / `panama-yacht-rentals`)
3. Specs: size, capacity, year, brand, model, captain, pink, free-hour
4. Pricing rows (headings / prices / notes)
5. Marina picker (from `/fy/v1/marinas` list)
6. Badges, search terms, blackouts, add-on overrides
7. Suite creates/updates the Woo product and writes `<!--fy-auto-->`

n8n **My Database - WordPress Price Push** can PATCH `price` weekly from the Google Sheet without opening WP.

---

## Integrations that depend on Suite

| System | How |
| --- | --- |
| WooCommerce | 1:1 product per yacht; checkout / deposits |
| BookMyBoat | `sku` `BMB-*`, `source_listing_id`, weekly sync workflows |
| n8n price push | `GET/POST /fy/v1/yachts` |
| n8n → GHL | signed webhooks `booking.paid`, `ticket.*` |
| Mom Bot / Support Receptionist | yacht lookup tool (sheet today; should use `fy/v1`) |
| Feeling Yachty Fleet Chatbot (this repo) | `FY_Chatbot_Fleet_Client` → `fy/v1` |
| Rank Math | sitemap includes `/fleet/miami/`; Suite SEO object on the yacht |

---

## Source map

Add paths here once `feeling-yachty-suite/` is in git.

| Area | File (to fill) |
| --- | --- |
| Bootstrap / version | `feeling-yachty-suite.php` — Version: 3.65.0 |
| CPT + taxonomies | |
| Yacht meta / pricing | |
| REST `fy/v1` | |
| Webhooks | |
| Shortcodes | |
| `fy-auto` product injector | |
| Front CSS/JS (`fy-*`) | |
| Marinas | |
| Activity log | |

---

## Changelog (docs + product)

### 3.65.0 — 2026-08-14 (docs created)

- Documented live `fy/v1` contract, fleets, marina list, pricing row types, badges.
- Documented Woo `<!--fy-auto-->` product pairing.
- Documented `fy-*` card / filter / price-panel UI from hub HTML.
- Documented HMAC webhooks used by n8n GHL sync (events since v2.6.0).
- Noted dual Miami fleets (`miami-yacht-rental` vs `miami-yacht-rentals`).
- PHP source zip still not in repo — shortcode names and admin click-path pending.

### How to log the next upgrade

1. Bump **Last reviewed** and add a `### x.y.z` heading here.
2. Diff REST fields, shortcodes, `fy-*` classes, webhooks, and Woo hooks.
3. Update the chatbot (`feeling-yachty-chatbot`) if the yacht JSON contract changed.
4. Keep this file in the same PR as the Suite code change.
