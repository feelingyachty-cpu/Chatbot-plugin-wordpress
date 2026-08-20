# Feeling Yachty Suite — how it works

**Living document.** Update this file on every Suite upgrade, shortcode change, REST change, or UI change.  
Last reviewed: **2026-08-20** against **feeling-yachty-suite 3.73.40** (this repo’s patched zip). Suite is the source of truth for yacht prices, fuel, and dock math.

Staff training PDF (easy language, add-yacht first, settings last): [Feeling-Yachty-Add-a-Yacht-Staff-Guide.pdf](Feeling-Yachty-Add-a-Yacht-Staff-Guide.pdf).  
Client-UX audit (bugs + fixes): [suite-audit-2026-08-14.md](suite-audit-2026-08-14.md).

Historical note: the 3.73.4 zip (read 2026-08-19) still carried 3.65.0-era pricing PHP and `product-express.js`. That stopped being true in 3.73.5+ — pricing PHP and the product JS have changed in nearly every release since; trust the changelog below, not that old comparison. This repo does not replace the uploaded plugin until you install the zip.

---

## What this plugin is

Feeling Yachty Suite is the **fleet + storefront plugin** for FeelingYachty.com. It is how the business:

- Sees and edits yachts (admin CPT `fy_yacht`)
- Adds yachts and syncs each one to a WooCommerce product
- Renders catalog / listing / product UI (the `fy-*` design system)
- Stores hourly charter pricing, pink-fleet flags, free-hour deals, badges, marinas, reviews
- Exposes a public REST API (`fy/v1`) for n8n and price push
- Sends signed webhooks for bookings and support tickets into GoHighLevel

This repo does **not** include a website chatbot. Chat was removed; the owner uses another solution.

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
              used by n8n price push and other automations
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
| `listed_from` | Guest From price: shortest row **boat price only** (crew + fuel are checkout fees) |
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

- `type: price` — `{duration, price, listed, free}`  
  `price` is the boat trip total. `listed` equals the boat price (what From / Hours show) — crew + fuel and the 20% deposit are checkout fees, never in the listing.  
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

`fy-support-bot/v1` still exists on production WordPress (`/chat`, `/test-connection`, `/coach`). It is **not** maintained in this repo. Do not add chatbot settings here.

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

If an upgrade changes class names, data attributes, or schema `@id`s, list the diff in the changelog below — front-end CSS depends on this.

---

## Shortcodes (PHP names)

From Suite 3.73.4 source (same shortcode names as 3.65.0):

| Shortcode | File |
| --- | --- |
| `[fy_yacht_fleet]` | `includes/class-fy-render.php` |
| `[fy_yacht_info]` and section tags | `includes/class-fy-woo.php` |
| `[fy_yacht_details]` | `includes/class-fy-woo.php` |
| `[fy_yacht_layout]` | `includes/class-fy-woo.php` |
| `[fy_saved_yachts]` | `includes/class-fy-woo.php` |
| `[fy_yacht_marina]` | `includes/class-fy-marina.php` |
| `[fy_yacht_gallery]` | `includes/class-fy-gallery.php` |

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
| Rank Math | sitemap includes `/fleet/miami/`; Suite SEO object on the yacht |

---

## Source map

From the 3.73.4 zip (not copied into git — production stays the uploaded plugin).

| Area | File |
| --- | --- |
| Bootstrap / version | `feeling-yachty-suite.php` — Version: 3.73.40 |
| CPT + taxonomies | `includes/class-fy-cpt.php` |
| Yacht meta | `includes/class-fy-metaboxes.php` |
| Pricing / quote | `includes/class-fy-pricing.php` |
| REST `fy/v1` | `includes/class-fy-rest.php` |
| Woo product sync + `booking.paid` | `includes/class-fy-woo.php` |
| Checkout / bareboat gate | `includes/class-fy-checkout.php` |
| Payments hub (Stripe/PayPal status) | `includes/class-fy-payments.php` |
| Account portal | `includes/class-fy-account.php` |
| Settings / GHL form / webhook secret | `includes/class-fy-settings.php` |
| Marinas | `includes/class-fy-marina.php` |
| Activity log | `includes/class-fy-log.php` |
| Support Bot | `includes/class-fy-support-bot.php` — **do not use; GHL owns comms** |
| App API (this repo) | `feeling-yachty-mobile-api/` → `fy-app/v1` |

---

## Changelog (docs + product)

### 2026-08-20 — light contact bar, kill the black slabs (3.73.40)

Upload **only** `dist/feeling-yachty-suite-3.73.40.zip`, purge Cloudflare.

- Mobile `#fy-mobile-contact-bar` is pale glass again (white / soft pink edge). The navy slab from 3.73.36 read as a heavy black bar under every phone page.
- Guest app (same PR): extras hero uses `cover` on a light frame instead of `contain` on navy — no more pillarbox bars on “Add your extras”. Bottom tab bar stays light floating glass, not navyDeep.

### 2026-08-20 — clear the corner for the chat widget; spreadsheet parity verified (3.73.39)

Upload **only** `dist/feeling-yachty-suite-3.73.39.zip`, purge Cloudflare.

- **Desktop spacing:** the floating checkout pill sat right on top of the GHL chat bubble's corner. On desktop the pill now rides well above the bubble zone (124px; 188px on product pages, clearing the Book bar too), and the Book bar's content gets right-side padding so the bubble never covers the price or button.
- **Spreadsheet parity (owner's original Excel):** validated all 151 catalog yachts against the uploaded fleet sheet — every duration row equals the sheet's Price/Hour × hours exactly, and every starting rate matches. Zero differences. With 3.73.38's boat-only listing, the site now shows precisely the original spreadsheet prices.


### 2026-08-20 — listed prices are the original spreadsheet boat prices again (3.73.38)

Upload **only** `dist/feeling-yachty-suite-3.73.38.zip`, load any page once, purge Cloudflare.

Owner decision: the listed price on every card, Hours row, product header, sticky bar, schema, REST (`listed_from`, `pricing[].listed`) and the app is the **boat price only** — the original fleet-spreadsheet figure. Crew + fuel (and the 20% deposit over $1,400) are fees that appear **at checkout only**; the charge math is unchanged (crew + fuel online by tier, boat at the dock). One-time migration force-updates the saved fleet blurb + legend to the new wording; all "boat + crew + fuel" tags become "boat price" with "crew + fuel added at checkout" notes. App pricing/tests updated to match (all pass).


### 2026-08-20 — fleet-wide charge audit: 2 stale yachts found, self-heal shipped (3.73.37)

Upload **only** `dist/feeling-yachty-suite-3.73.37.zip`, then open any wp-admin page once (the self-heal runs there).

Audited **all 200 yachts one by one** against what WooCommerce actually charges online (live Store API). **198 conform exactly** to the rule — row price is boat-only; online charge = crew+fuel by tier ($75+$25 at ≤$800, $75+$50 at $801–$1,400, $100+$50 + 20% deposit over $1,400); per-yacht overrides honored. **2 were stale:**

| Yacht | Wrong charge | Correct | Cause |
| --- | --- | --- | --- |
| 45ft Pink “Barbie II” (2 Hours) | $200 | **$250** | fuel still at the ≤$800 rate after the boat price moved up a band |
| 60ft “Blessed Gold” (3 Hours) | $740 | **$760** | 20% deposit still computed on the old $1,450 boat price (now $1,550) |

New self-heal (`maybe_resync_stale_variations`, admin_init, one-time): recomputes every yacht's expected charges from its CURRENT rows and rebuilds only products whose stored variation prices drifted. Cheap for the healthy fleet (one cached price read per yacht); logs how many it rebuilt.


### 2026-08-20 — bottom-edge cleanup: empty pill, contact bar, branding (3.73.36)

Upload **only** `dist/feeling-yachty-suite-3.73.36.zip`, hard-refresh, purge Cloudflare.

- **"$0.00 due today · 0 items" pill showed with an empty cart.** The pill renders with the `hidden` attribute when empty, but `.fy-cart-pill{display:flex}` beat the browser's `[hidden]{display:none}` rule. Fixed with `.fy-cart-pill[hidden]{display:none!important}`.
- **Mobile bottom-edge stacking.** The site's fixed contact bar (`#fy-mobile-contact-bar`, 92px, z-index 9999999) owns the bottom edge on phones, with a round chat bubble at the corner. The checkout pill now stacks ABOVE the bar and clear of the bubble (right: 76px), the sticky Book bar sits on top of the bar instead of covering it, and on mobile product pages the pill is hidden entirely (the Book bar + booking popup own that journey — three floating layers was clutter).
- **Contact bar rebrand.** The blush bar now wears the app shell's navy glass (same gradient as the checkout pill) with a pink accent border; the CALL / WhatsApp buttons keep their brand gradients.
- Live UI scan of product + cart endpoints: no NaN/undefined/price anomalies found.


### 2026-08-20 — menu submenus: beat SmartMenus with a capture-phase toggle (3.73.35)

Upload **only** `dist/feeling-yachty-suite-3.73.35.zip`, hard-refresh, purge Cloudflare.

Deep-dive result (verified live): the popup menu is an **Elementor Pro nav-menu widget**, and its anchors are wired to the **SmartMenus** jQuery library (`jquery.smartmenus.min.js` loads on every page). SmartMenus' element-level click handlers run BEFORE any document-level bubble listener — so the 3.73.28/31 toggles never saw the tap; SmartMenus swallowed it (its desktop/hover mode does nothing for a touch inside the popup). That is why Miami / Panama stayed shut regardless of menu configuration.

Fix: the submenu toggle now runs in the **capture phase** (fires before SmartMenus can touch the event) and stops propagation inside the popup so SmartMenus cannot fight the toggle. The reveal CSS also neutralises SmartMenus' inline absolute positioning (top/left/width/clip) so the submenu lays out inline under its parent. Dual-tap for real-link parents and untouched desktop hover menus stay as designed.


### 2026-08-20 — checkout bounce diagnosed: Cloudflare caching cart/checkout (3.73.34)

Upload **only** `dist/feeling-yachty-suite-3.73.34.zip` — then fix Cloudflare (below), which is the actual cause.

**Symptom:** after booking, the popup's Checkout button lands on a broken/empty cart instead of checkout. **Cause:** Cloudflare is caching full HTML including `/checkout/` — every guest receives the same stored response (including a cached "empty cart → /cart/" redirect) regardless of their own cart. The site's HTML cache is provably aggressive (home page served weeks-old 3.73.3 assets before purge).

**Cloudflare fix (owner action):** Rules → Cache Rules → new rule: Bypass cache when URI Path contains `/cart` OR `/checkout` OR `/my-account` OR Cookie contains `woocommerce_` — then Purge Everything. Long-term: use the official Cloudflare WP plugin/APO instead of Cache Everything.

**Plugin hardening in 3.73.34:** the `?fy_added=1` booking-confirmation page variant now sends `DONOTCACHEPAGE` + no-cache headers so page caches can never store or replay it.


### 2026-08-20 — clean layering in the sticky filter panel (3.73.33)

Upload **only** `dist/feeling-yachty-suite-3.73.33.zip`, hard-refresh, purge Cloudflare.

Three layering bugs made the pinned filter panel look like everything was bleeding together (screenshot-verified):

1. The app shell was making `.fy-search-row` sticky + frosted **inside** the already-sticky, already-translucent `.fy-inventory-panel` — translucency stacked on translucency, so buttons scrolling underneath ghosted through. The app-shell rule is removed; the panel alone owns sticky.
2. On phones the panel goes **fully opaque white** while pinned (was `rgba(255,255,255,.95)` + blur) — the "Clear filters" pill and the WhatsApp/call buttons scrolling underneath can no longer show through.
3. The "more chips this way" fade was 40px wide and sat on top of a chip's text right next to the Saved pill. On mobile it's narrowed to 22px, and a hairline divider now separates the scrolling chips from the pinned Saved pill, with breathing room between the three rows.

### 2026-08-20 — compact filter chips on mobile (3.73.32)

Upload **only** `dist/feeling-yachty-suite-3.73.32.zip`, hard-refresh, purge Cloudflare.

The filter chips and the Saved pill were desktop-sized on phones (12.5–13px text, 36–40px tall) — too big to fit, forcing a scroll for even five chips. On mobile (≤860px) they now run 11px text, 30px tall, tighter padding and gaps, and a smaller count badge, so the whole row fits a typical phone screen at a glance. Desktop sizes unchanged. (The Saved-pill overrides carry a `.fy-filter-bar` ancestor for specificity — its base rules come later in the stylesheet.)

### 2026-08-20 — Destinations → Miami / Panama City expand reliably (3.73.31)

Upload **only** `dist/feeling-yachty-suite-3.73.31.zip`, hard-refresh, purge Cloudflare.

Nested menu parents (Destinations → Miami / Panama City) didn't expand: their links aren't literally `#` — WordPress "Custom Link" placeholders are often `https://site.com/#`, which the old check counted as a real URL, so the tap navigated (to the homepage) instead of opening the submenu. New rules at every nesting depth:

- Placeholder links (``, `#`, `#anything`, `…/#`, `http://#`) → tap **toggles** the submenu, anywhere on the site.
- Real links **inside the menu popup** → first tap **expands**, second tap on the open parent **navigates** (the standard mobile dual-tap pattern — children reachable, page too).
- Real links in desktop hover menus stay untouched.

### 2026-08-20 — compact mobile filter bar (3.73.30)

Upload **only** `dist/feeling-yachty-suite-3.73.30.zip`, hard-refresh, purge Cloudflare.

On phones/tablets (≤860px) the sticky filter bar shrinks to three short rows:

1. Search, full width.
2. The two dropdowns (Price sort / Size) **side by side, half width each** with a tighter chevron inset.
3. The popular-filter chips and the **Saved Yachts pill on one shared row** — chips scroll horizontally in the leftover space, Saved stays pinned on the right. The standalone "POPULAR FILTERS" heading is hidden on mobile (the chips speak for themselves).

Desktop layout unchanged.

### 2026-08-20 — book-experience popup + mobile menu polish (3.73.29)

Upload **only** `dist/feeling-yachty-suite-3.73.29.zip`, hard-refresh, purge Cloudflare.

- **Booking no longer dumps guests into the cart.** After "Book Experience" on a yacht, the guest stays on the yacht page (`woocommerce_add_to_cart_redirect` override, yacht products only) and gets the confirmation dialog: animated ✓, "**Your experience is in the cart**", the yacht's name + photo, a **Continue** button that just closes it, and a gradient **Checkout →** button. Small "View cart" and "View All Yachts" links in the footer; the add-on cross-sell line stays. The `?fy_added=1` trigger flag is scrubbed from the address bar so refresh/share can't re-open it.
- **Mobile menu polish** (scoped to menus inside Elementor popups): 48px app-style touch targets, soft dividers, blush hover, pink chevrons on expandable parents (Miami / Panama) that flip when open, indented fade-in submenus. Pairs with 3.73.28's click-to-expand fix.

### 2026-08-20 — Miami / Panama menu items open again (3.73.28)

Upload **only** `dist/feeling-yachty-suite-3.73.28.zip`, hard-refresh, purge Cloudflare.

The site menu is an Elementor Pro popup (hamburger → popup 18475). Parent items like **Miami** and **Panama** are placeholder links (`#`) whose submenu should expand on click — but no script handled that inside the popup, so they did nothing (the site even carries old `pointer-events: auto` custom-CSS attempts at this). The app shell now handles it site-wide: any menu parent with a placeholder link toggles its own submenu on click (real links still navigate normally), with CSS that beats every hiding trick. Also: the checkout pill hides while an Elementor popup is open so it can never cover a menu item, and the hover-prefetcher now ignores hash-only / Elementor-action links instead of wastefully prefetching their base page.

If the owner prefers Miami/Panama to NAVIGATE instead of expand, give them real URLs in Appearance → Menus (e.g. `/miami-yacht-rental/`) — the toggle only claims placeholder links.

### 2026-08-20 — stop forcing the old plum header; kill the purple flash (3.73.27)

Upload **only** `dist/feeling-yachty-suite-3.73.27.zip`, hard-refresh, and purge Cloudflare / host cache.

The Suite was forcing the site header **dark plum (#1B1033 !important)** on every WooCommerce page — a leftover from when the theme header was pale and the cream logo invisible. With the site's own modern header in place, the forced plum painted on first render and flashed purple until the real header styles took over (an extra style-fight repaint on every load). Both blocks are removed — the header now belongs entirely to the theme/Elementor. The dark plum stays only where it's intentional: the branded order-email header.

If a flash remains on non-Woo pages after the cache purge, it's the theme/Elementor sticky-header effect, not the Suite.

### 2026-08-20 — fleet filter bar in brand pink (3.73.26)

Upload **only** `dist/feeling-yachty-suite-3.73.26.zip` and hard-refresh the fleet page.

- **Sort / size dropdowns**: pink bold text, a drawn-in pink chevron (native grey arrows can't be recolored, so the native widget look is replaced), blush gradient fill, and a pink glow on hover/focus. Open-menu options stay ink-on-white for readability.
- **Filter chips**: idle text was the grey "muted" tone and read as disabled — now full-contrast ink on a blush border; hover fills blush; the **active** chip becomes the brand pink→purple gradient with white text (same family as the Saved Yachts pill), so the chosen filter is obvious at a glance.
- **POPULAR FILTERS label** now pink with wider letter-spacing.

### 2026-08-20 — app shell: the site feels like the app (3.73.25)

Upload **only** `dist/feeling-yachty-suite-3.73.25.zip` and hard-refresh. No product re-sync.

Design ideas ported from the Feeling Yachty mobile app (`apps/feeling-yachty`), built as a tiny dependency-free site-wide layer (`assets/theme/app-shell.css/js`):

- **Floating checkout pill** on every page once something is in the cart: live "due today" total + item count, one tap to checkout. Server-rendered and kept live by WooCommerce's own cart-fragments script — an AJAX add anywhere updates it without a reload. Hidden on cart/checkout; lifted above the Book bar on product pages.
- **Live sticky Book bar** on product pages: the bar's generic "From $X" switches to the real **Due today** figure (with a price-pop animation) the moment the visitor picks date/duration/add-ons — mirrored straight from the on-page summary so there is exactly one source of pricing truth.
- **App-instant navigation**: hover/touch prefetch (instant.page-style — the next page's HTML is fetched the moment the pointer settles on a link; skips cart/checkout/account/action URLs, respects data-saver), plus CSS cross-document view transitions for a native cross-fade between pages on Chrome/Edge/Safari.
- **App polish**: press-scale feedback on cards/buttons (mirrors the app's PressScale), sticky frosted search + sort toolbar on the fleet page, shimmer placeholders while card photos stream in, smooth scrolling. All honors `prefers-reduced-motion`.
- **Speed**: preconnect to the BookMyBoat image CDN on every page, app-shell JS loaded deferred, zero jQuery in the new layer; fleet images were already lazy-loaded with eager first-3.

### 2026-08-20 — product URLs survive uploads; yachts back on their own fleet slug (3.73.24)

Upload **only** `dist/feeling-yachty-suite-3.73.24.zip`, then load any page once. No Permalinks save needed — the plugin now re-flushes itself.

Two live-site fixes, both verified against feelingyachty.com:

1. **Every zip upload silently killed the /{city}/{yacht}/ URLs.** An activation-time rewrite flush runs before this plugin's own rules are registered in that request, so the saved ruleset lost every city rule — all product URLs 404ed, and the site's 404→homepage redirect bounced the whole catalog to the front page. Now: activation registers the taxonomy + city rules by hand before flushing, **and** a version-guarded re-flush runs once per plugin version on the first normal request (wp_loaded, when every rule exists), healing the ruleset no matter how the zip was installed.
2. **All 178 current-catalog yachts canonicalised to the retired `/miami-yacht-rentals/` base.** The saved URL base was still the old literal default ("miami-yacht-rentals"), which pins every yacht in every fleet to that one base — while the fleet cards link to `/miami-yacht-rental/…`. A one-time migration restores the `%fleet%` default whenever the saved base is a literal matching an existing fleet slug, so each yacht lives under its own fleet's URL. Old plural links keep working (the per-city rule resolves the product and the canonical redirect moves it to the right base). A custom base that is NOT a fleet slug is left untouched.

Also worth knowing: the site redirects **every** 404 to the homepage (verified with a nonsense URL). That hides real errors — consider turning that off in the SEO plugin so a 404 looks like a 404.

### 2026-08-20 — stop hijacking page URLs under fleet-category slugs (3.73.23)

Upload **only** `dist/feeling-yachty-suite-3.73.23.zip` and hard-refresh. No product re-sync. If URLs still misbehave after upload, do Settings → Permalinks → Save Changes once.

**Symptom:** after uploading the previous zip, site URLs under the fleet-category bases bounced to the homepage.

**Cause:** the pretty-URL rewrite claims `/{fleet-category-slug}/{anything}/` for WooCommerce products at top priority — for every `fy_yacht_cat` term, even empty ones (`miami-yacht-rental`, `miami-yacht-rentals`, `panama-yacht-rentals`). On the live site, other content lives under those same bases: the 49 legacy Miami listings at `/miami-yacht-rentals/…` and nested pages like `/panama-yacht-rentals/contadora-yacht-charter/`. The old safety net only rescued yachts, so everything else became a "product not found" 404 — and the site's 404 handling redirects 404s to the homepage. Uploading a zip reactivates the plugin, which re-flushes rewrite rules, which is why it appeared right after the update.

**Fix:** when a claimed URL is not a product and not a yacht, the request is handed back to whatever actually owns it — a nested page by its full path first, then any public post type (blog post, legacy listing CPT) by slug. Product and yacht URLs behave exactly as before.

### 2026-08-19 — fuel is no longer credited at the dock (3.73.22)

Upload **only** `dist/feeling-yachty-suite-3.73.22.zip` and hard-refresh. No product re-sync.

Fuel is a real charge added on top of the boat for every price tier — it is **not** deducted from the dock balance anymore. Due at the dock is the **full boat price** (minus only the 20% / premium boat deposit when one was paid).

$770 boat, 4 hours: crew $300 + fuel $100 = charged today **$400** · due at the dock **$770** (was wrongly $670) · charter total **$1,170**. Charged today + dock now always equals boat + crew + fuel (+ extras).

Cancellation stays the same: crew is non-refundable, and the fuel charge is taken as a deposit if the guest cancels. The 20% boat deposit is still credited toward the boat.

### 2026-08-19 — deep-dive bug-fix release (3.73.21)

Upload **only** `dist/feeling-yachty-suite-3.73.21.zip` and hard-refresh. No product re-sync.

Money fixes:

- **Extras were charged 150% online.** The yacht line already contained 50% of the extras and the add-ons hook added the same 50% again. Bookings with add-ons now charge exactly crew + fuel (+ 20% deposit) + half the extras.
- **Thank-you page understated “Deposit paid”** (it showed only fuel + deposit, missing crew). It now reads the real amount charged.
- **“Full charter price” now includes crew**, so on cart, checkout, order emails, and the thank-you page: full price = charged today + due at the dock. Barbie 3h: full **$942** = today **$300** + dock **$642**. (Listed From stays **$1,017** — fuel and the 20% deposit are credited at the dock.)
- **Yachts with no duration rows** were priced at the retired 30% deposit. Their simple product now charges the shown price in full (nothing due at the dock).

Safety and display fixes:

- The fuel FAQ rewrite now backs up every yacht FAQ (`_fy_faq_before_fuel_copy`), only removes lines the Suite itself seeded, and skips yachts with no FAQ (auto-answers keep following settings there).
- The product-page summary always shows the Suite’s own math when a pricing row exists (a stale Woo variation price can no longer appear as “Charged today”), never renders a “$0 boat” breakdown, and labels the charter total “boat + crew + fuel + deposit” when the 20% applies.
- Per-yacht single overrides no longer mislabel the other rate (“$100/hr crew” on a $75/hr boat).
- Rows with unparseable duration labels (“Full Day”) list the plain boat price instead of boat + 20%.
- App: expanded Hours rows on cards now show listed totals (they showed boat-only prices contradicting the From line), Spanish copy now matches the fuel-as-deposit policy, and “Pay for 4 Get 5” durations parse as 5 hours like the Suite.

### 2026-08-19 — hourly charge is fuel again; cancel keeps it as a deposit (3.73.20)

Upload **only** `dist/feeling-yachty-suite-3.73.20.zip` and hard-refresh. No product re-sync.

The $25 / $50 hourly line is **fuel** again (not “boat deposit”). If a guest cancels, that fuel charge is taken as a deposit and is not refunded. Crew stays a non-refundable reservation fee. The 20% over $1,400 is still a boat deposit.

On first load, Suite rewrites the fleet blurb, the cancellation policy, and **every yacht FAQ**.

Listed From stays boat + crew + fuel. Barbie 3h listed **$1,017**. Today still **$300**.

### 2026-08-19 — listed price is boat + crew + deposit (3.73.19)

Upload **only** `dist/feeling-yachty-suite-3.73.19.zip` and hard-refresh the fleet and a product page. No product re-sync.

From / Hours add **crew and the boat deposit** on top of the boat row. Due today and dock math do not change.

Barbie 3 hours: boat **$717** + crew **$225** + deposit **$75** = listed **$1,017**. Today still **$300**. Dock still **$642**.

Live Coco: 3h **$1,475** / 4h **$1,850** / 5h **$2,790**.

### 2026-08-19 — Due today is crew + deposit, not the boat (3.73.18)

Upload **only** `dist/feeling-yachty-suite-3.73.18.zip` and hard-refresh a product page. No product re-sync.

Barbie (40ft Silverton) listed the 3-hour **boat** at **$717** and showed that same number as Due today — the product page was scraping Woo’s leftover boat price before hours were picked. Boat $717 is under $800, so today is crew $75/hr + deposit $25/hr = **$300**. Listed From is boat + crew = **$942**. Dock is **$642**.

Woo leftovers that still store the boat as the variation price are ignored for Due today and for cart totals. Checkout uses the Suite fee formula.

### 2026-08-19 — Plugins page no longer dumps you on the homepage (3.73.17)

Upload **only** `dist/feeling-yachty-suite-3.73.17.zip`. If Plugins still will not open, log in at `https://feelingyachty.com/wp-login.php` (WordPress admin), not the website My Account form.

Suite was running fleet migrations on Plugins / Updates. A timeout there can show the host homepage. WooCommerce also sends customer logins away from wp-admin — if My Account is the front page, that looks like “I clicked Plugins and landed on home.”

3.73.17 skips every one-time fleet job on Plugins / Updates, never claims `wp-admin` / `plugins` as a yacht URL, and keeps users who can manage plugins or the fleet inside wp-admin after login.

### 2026-08-19 — add crew to every listed price (3.73.16)

Upload **only** `dist/feeling-yachty-suite-3.73.16.zip` and hard-refresh the fleet and a product page. No product re-sync.

Live browse on 2026-08-19 still showed boat-only Hours labeled “Total charter price” (Coco From **$1,100**, Hours 3h **$1,100** / 4h **$1,350** / 5h **$1,700**) and “Crew and fuel are additional.” The product-page Hours table in 3.73.15 still printed the boat row and skipped crew.

3.73.16 adds crew on every guest listed number:

- Fleet From / Hours
- Product card Hours (`card_header`)
- Woo catalog / product price HTML (was the $500 due-today variation)
- REST `listed_from` plus `listed` on each `pricing[]` row (`price` stays the boat total)

Live Coco after upload: From **$1,325** for 3 hours ($1,100 boat + $225 crew). 4h **$1,650**. 5h **$2,200**. Today / dock dollars do not change (Coco 4h still $500 today / $1,150 dock on the $1,350 boat).

### 2026-08-19 — listed price is boat + crew (3.73.15)

Upload **only** `dist/feeling-yachty-suite-3.73.15.zip` and hard-refresh the fleet. No product re-sync.

Live cards were showing boat-only (Coco From $855) with “Crew and fuel are additional.” The listed From / Hours & Pricing total is now **boat + crew** — what the guest actually pays. The hourly boat deposit is credited toward the boat, so it is not added on top.

Coco 3 hours: listed **$1,080** ($855 boat + $225 crew).  
Coco 4 hours: listed **$1,440** ($1,140 + $300). Today still $500, dock still $940.

Fleet intro copy that still said fuel is additional is rewritten on first load.

### 2026-08-19 — no leftover fuel-fee copy (3.73.14)

Upload **only** `dist/feeling-yachty-suite-3.73.14.zip` and hard-refresh. On first load, Suite rewrites the saved cancellation policy and any yacht FAQ that still says “crew and fuel fees.”

Guest-facing leftovers removed: empty-cart “fuel / free to reschedule” lines, checkout cancellation (“deposit refunded minus crew”), help text that still said a 30% deposit, leftover Mobile API card FAQ if that plugin ever loads.

### 2026-08-19 — crew + boat deposit, not fuel (3.73.13)

Upload **only** `dist/feeling-yachty-suite-3.73.13.zip` and hard-refresh product pages. **No product re-sync needed** — Woo variation totals are unchanged. Only labels and dock math change.

Only **crew + deposit** are charged online to confirm the booking. That reserves the boat and crew for the selected date and hours.

| Boat total | Crew | Hourly boat deposit | Extra boat deposit |
| --- | --- | --- | --- |
| $800 or less | $75/hr | $25/hr | none |
| $801–$1,400 | $75/hr | $50/hr | none |
| Over $1,400 | $100/hr | $50/hr | 20% of the boat |
| Premium yachts | — | — | may require 50% |
| Extras | — | — | 50% due now |

Crew reservation fees and deposits are **non-refundable** if the guest cancels. Any boat deposit is credited toward the boat price. Crew is **not** credited against the boat.

**Dock = boat − hourly deposit − % boat deposit + unpaid extras.** Remaining balance is cash or Zelle only.

Coco 4 hours ($1,140): crew $300 + deposit $200 = **$500 today**, **$940 at the dock**.  
Coco 5 hours ($1,425): crew $500 + deposit $250 + 20% $285 = **$1,035 today**, **$890 at the dock**.  
Sundeck 3 hours ($330): crew $225 + deposit $75 = **$300 today**, **$255 at the dock**.

Guest FAQ, Hours & Pricing note, settings, metabox, cart, schema, and checkout copy all use this wording. Internal setting keys stay `_fy_fuel_rate` / `fuel_rate` so the database does not migrate.

### 2026-08-19 — cheapest first (3.73.12)

Upload **only** `dist/feeling-yachty-suite-3.73.12.zip` and hard-refresh the fleet page. No product re-sync needed.

The fleet grid, REST list, and Visualizer default to **lowest “From $…” trip total first** (same number as the card). Unpriced yachts go last. Shoppers can still pick High to Low, size, or Featured.

### 2026-08-19 — full systems check (3.73.11)

Upload **only** `dist/feeling-yachty-suite-3.73.11.zip`, then re-sync yacht products and hard-refresh.

- Native orders no longer invent boat cost as `_fy_price × hours` when that field is a package total (the $17,480 dock case). Row first, then same-hours row, then hourly only if it really is hourly.
- Native Woo orders now write `_fy_duration` / Charter length so emails and GHL see the hours picked.
- Product card also reads `fy_booking_date` / `fy_charter_start_time` if the theme field has no id.
- Saving Checkout settings cannot put the store back on the old percent/flat deposit. Leftover `754` phones are rejected on save.
- Schema FAQ uses the live extras split, not hardcoded 50%. Email WhatsApp links add the US `1` for 10-digit Miami numbers.
- If the leftover Mobile API plugin is still installed, 1.1.7 no longer replaces Suite’s card or rewrites fuel. Do not upload it unless you need `fy-app/v1`.

Known leftover (not changed): yachts with two “3 Hours” rows (Mon–Thu vs Fri–Sun) still share one Woo variation slug. Woo picks the first. Weekend-priced boats need separate labels until that is redesigned.

### 2026-08-19 — bug pass (3.73.10)

Upload **only** `dist/feeling-yachty-suite-3.73.10.zip`, then re-sync yacht products.

- Hours & Pricing notes now use the live $800 / $1,400 settings instead of hardcoded copy. A yacht with its own crew/fuel override says so instead of advertising the fleet bands.
- SEO schema default phone is **+1 954-246-3636**. Leftover `754-325-3827` in Yacht Fleet → SEO is rewritten on upload.
- Yacht fields that still hold the old fleet defaults ($50/$75 fuel, $75/$100 crew) are cleared so the $800 / $1,400 bands apply. A real override (2-person crew, etc.) is left alone.
- Yacht metabox placeholders no longer show $100 / $50 (typing those locked the yacht out of the bands). Leave blank for fleet bands.
- Product card treats a real `0` crew/fuel rate as off, not as a missing $50.
- Invalid `deposit_type` falls back to crew + fuel online, not the old percent deposit.

### 2026-08-19 — $800 fuel split (3.73.9)

Upload **only** `dist/feeling-yachty-suite-3.73.9.zip`, then re-sync yacht products.

Boat cost is still the Hours & Pricing total for the hours picked.

| Boat total | Crew | Fuel | Reservation deposit |
| --- | --- | --- | --- |
| At or under $800 | **$75/hr** | **$25.00/hr** | none |
| Over $800 and at or under $1,400 | **$75/hr** | $50/hr | none |
| Over $1,400 | **$100/hr** | $50/hr | 20% of the boat |

Same wording on the product FAQ, Hours & Pricing note, deposit blurb, Checkout settings, and schema.

Coco 4 hours ($1,140) is unchanged: **$500 today**, **$640 at the dock**.

### 2026-08-19 — $1,400 crew split (3.73.8)

Upload **only** `dist/feeling-yachty-suite-3.73.8.zip`, then re-sync yacht products.

The **$1,400 line is the boat total for the hours picked** (Hours & Pricing), not crew or fuel.

| Boat total | Crew | Fuel | Reservation deposit |
| --- | --- | --- | --- |
| At or under $1,400 | **$75/hr** | $50/hr | none |
| Over $1,400 | **$100/hr** | $50/hr | 20% of the boat |

Coco 4 hours ($1,140): crew $300 + fuel $200 = **$500 today**, **$640 at the dock**.  
Coco 5 hours ($1,425): crew $500 + fuel $250 + 20% $285 = **$1,035 today**, **$390 at the dock**.

Guest FAQ, Hours & Pricing note, deposit blurb, settings, and schema all use this same wording.

### 2026-08-19 — Miami phone is 9542463636 (3.73.7)

Upload **only** `dist/feeling-yachty-suite-3.73.7.zip`. Call/SMS phone is **9542463636**. WhatsApp stays `19542463636` (country code + that same line) so `wa.me` works. Leftover `17543253827` / `754-325-3827` is rewritten on upload.

### 2026-08-19 — bug pass (3.73.6)

Upload **only** `dist/feeling-yachty-suite-3.73.6.zip`. Then re-sync yacht products and hard-refresh Coco.

- Stale Woo variation (still $75 fuel) no longer invents a reservation deposit or rewrites the boat total on the card. Dock stays `boat − charged today`.
- Plugin date/time fields post as `fy_booking_date` / `fy_charter_start_time` so an empty hidden copy cannot wipe the theme’s start time (PHP last-wins).
- `quote()` accepts storefront times (`9:00 am`, half-hour slots) instead of requiring an exact settings-list match (`9:00 AM`). Extra share is included in today’s deposit.
- Settings copy / schema FAQ now say today’s payment is credited against the boat. WhatsApp/phone leftovers `17543253827` migrate to Miami `19542463636`. Missing `deposit_type` sanitizes to `crew_fuel`.
- Support Bot does not boot when `feeling-yachty-no-chatbot` is installed (defines `FEELING_YACHTY_NO_CHATBOT`).

### 2026-08-19 — Suite is the source of truth (3.73.5)

Dock math and fleet fuel live in Suite, not the mobile API.

- Fuel **$50/hr** fleet-wide (3.73.4 had migrated saved $50 up to $75).
- Card / quote / cart / order: **due at dock = boat − charged today**.
- Coco 4 hours: $1,140 boat, $600 today (crew $400 + fuel $200), **$540 at the dock**.
- Re-sync yacht products after upload so Woo variations use $50 fuel.

### 2026-08-19 — Suite 3.73.4 zip scanned

Read `feeling-yachty-suite-3.73.4.zip`. Diff vs 3.65.0:

**Still broken — Coco dock math (same files as 3.65.0)**

- `assets/theme/product-express.js` is unchanged. Dock is `boat − reservationDeposit`, not `boat − charged today`.
- Coco 4 hours: boat $1,140, charged today $700 (crew+fuel), reservation deposit $0 because $1,140 is under the $1,400 threshold. Card still prints **Plus $1,140 at the dock**.
- `includes/class-fy-pricing.php` is unchanged. `quote()` balance is `(boat + crew + fuel + extras) − (crew + fuel + reservation)` = full boat, so emails/orders agree with the wrong card.
- Cart `cart_totals()` still does `(hourly + crew + fuel) × hours` for native add-to-cart. Order meta uses the pricing row (safer). Package-price yachts can still show an inflated cart dock line.
- Upload **mobile-api 1.1.4** with 3.73.4. The overlay still matches these class names (`.fy-pay-summary`). 3.73.4 alone does not fix Coco.

**Fixed in 3.73.4 (worth installing)**

- `%fleet%` URL base: saving Display Settings no longer strips the placeholder into `/fleet/` and 301-loops yacht ↔ product pages. Panama no longer inherits a Miami-only base.
- Product page now posts `booking_date` / `charter_start_time` into the cart (`fy_date` / `fy_time`). Native Woo checkout used to throw the date away (“Scheduled with our team after checkout”).
- App-style booking skin (`booking-ui.js` / `.css`), swipe gallery (`gallery-slider.js`), branded empty cart (`cart-empty.js`). Skin only — it writes back to the same fields. Does not change money math.

**Still present, not Coco**

- `class-fy-support-bot.php` is still bootstrapped. Keep `feeling-yachty-no-chatbot` installed. GHL owns guest comms.
- Settings defaults still ship WhatsApp `17543253827` (live Miami phone is `9542463636`). Defaults only apply on a fresh settings save. Fixed in 3.73.7.

### 2026-08-16 — mobile + GHL plan, Suite zip read

- Read `feeling-yachty-suite-3.65.0` zip. Filled source map and shortcodes.
- Confirmed live Miami fleet: **178/178** yachts have a Woo `product_id` + `product_url`.
- Added [app-ghl-woocommerce-plan.md](app-ghl-woocommerce-plan.md): one Expo app, Woo checkout, GHL for all messages. No chatbot.
- Companion plugins: `feeling-yachty-mobile-api`, `feeling-yachty-no-chatbot`.
- Expo app: `apps/feeling-yachty`.

### 2026-08-15 — staff add-a-yacht PDF

- Added [Feeling-Yachty-Add-a-Yacht-Staff-Guide.pdf](Feeling-Yachty-Add-a-Yacht-Staff-Guide.pdf) for training: add a yacht first, then every guest page a change should hit, settings last.
- HTML source: [guides/add-a-yacht-staff-guide.html](guides/add-a-yacht-staff-guide.html). Rebuild the PDF with Chrome `--print-to-pdf` after Suite upgrades.

### 2026-08-14 — client UX audit

- Added [suite-audit-2026-08-14.md](suite-audit-2026-08-14.md): dual URLs, `/fleet/miami/` → homepage, 200-yacht API cap (27 boats dropped), hourly vs total price confusion, old 49-boat fleet, Panama missing from Suite.

### 2026-08-14 — chatbot removed

- Deleted `feeling-yachty-chatbot/` (widget, REST `fy-chatbot/v1`, Settings → FY Fleet Chatbot, shortcode `[fy_fleet_chat]`, n8n webhook setting).
- This repo is Suite documentation only. Do not reintroduce chatbot settings.

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
3. Keep this file in the same PR as the Suite code change.
